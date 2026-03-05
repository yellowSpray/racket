import { supabase } from "@/lib/supabaseClient"
import type { Match } from "@/types/match"
import type { Group } from "@/types/draw"
import type { Event } from "@/types/event"
import { useCallback, useState } from "react"
import { intervalToMinutes } from "@/lib/utils"
import {
    generateGroupRounds,
    mapRoundsToDates,
    assignTimeSlotsForDates,
    calculateTimeSlots,
    calculateDates,
    type PlayerConstraints,
} from "@/lib/matchScheduler"
import { computeEloUpdates, type EloMatchResult } from "@/lib/eloEngine"

/**
 * Extrait "HH:MM" depuis un timestamp Supabase (ex: "2026-03-05T20:00:00+00:00")
 * ou un time (ex: "20:00:00+00"). Évite les décalages de timezone de new Date().
 */
function extractTime(value: string): string {
    // Format timestamp ISO : "2026-03-05T20:00:00+00:00" → chercher après le T
    const isoMatch = value.match(/T(\d{2}:\d{2})/)
    if (isoMatch) return isoMatch[1]
    // Format time brut : "20:00:00+00" ou "20:00"
    const timeMatch = value.match(/^(\d{2}:\d{2})/)
    if (timeMatch) return timeMatch[1]
    return ""
}

export function useMatches() {

    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const fetchMatchesByEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) {
            setMatches([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Récupérer les groups de l'event pour filtrer
            const { data: groups, error: groupsError } = await supabase
                .from("groups")
                .select("id")
                .eq("event_id", eventId)

            if (groupsError) {
                setError(groupsError.message)
                return
            }

            if (!groups || groups.length === 0) {
                setMatches([])
                return
            }

            const groupIds = groups.map(g => g.id)

            const { data, error: fetchError } = await supabase
                .from("matches")
                .select(`
                    *,
                    player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
                    player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
                    group:groups(id, group_name, event_id)
                `)
                .in("group_id", groupIds)
                .order("match_date", { ascending: true })
                .order("match_time", { ascending: true })

            if (fetchError) {
                setError(fetchError.message)
                return
            }

            setMatches((data as Match[]) || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }, [])

    const generateMatches = async (event: Event, groups: Group[]): Promise<{ total: number; placed: number } | null> => {
        setLoading(true)
        setError(null)

        try {
            // 1. Calculer les dates de jeu (nécessaire pour le bye optimization)
            const dates = calculateDates(event.start_date, event.end_date, event.playing_dates)
            const durationMin = intervalToMinutes(event.estimated_match_duration)
            const timeSlots = calculateTimeSlots(
                event.start_time || "19:00",
                event.end_time || "23:00",
                durationMin
            )

            // 3. Récupérer les contraintes des joueurs (arrivée, départ, absences)
            const playerIds = new Set<string>()
            for (const group of groups) {
                for (const player of group.players || []) {
                    playerIds.add(player.id)
                }
            }

            const constraints = new Map<string, PlayerConstraints>()

            if (playerIds.size > 0) {
                const ids = Array.from(playerIds)

                const [scheduleEventRes, scheduleGeneralRes, absencesEventRes, absencesGeneralRes] = await Promise.all([
                    // Schedules liés à cet événement
                    supabase
                        .from("schedule")
                        .select("profile_id, arrival, departure")
                        .eq("event_id", event.id)
                        .in("profile_id", ids),
                    // Schedules généraux (sans event_id) — fallback
                    supabase
                        .from("schedule")
                        .select("profile_id, arrival, departure")
                        .is("event_id", null)
                        .in("profile_id", ids),
                    // Absences liées à cet événement
                    supabase
                        .from("absences")
                        .select("profile_id, absent_date")
                        .eq("event_id", event.id)
                        .in("profile_id", ids),
                    // Absences générales (sans event_id) — fallback
                    supabase
                        .from("absences")
                        .select("profile_id, absent_date")
                        .is("event_id", null)
                        .in("profile_id", ids),
                ])

                // Construire la map de contraintes
                for (const id of ids) {
                    constraints.set(id, { arrival: "", departure: "", unavailable: [] })
                }

                // D'abord appliquer les schedules généraux (fallback)
                if (scheduleGeneralRes.data) {
                    for (const s of scheduleGeneralRes.data) {
                        const c = constraints.get(s.profile_id)
                        if (c && s.arrival) {
                            c.arrival = extractTime(s.arrival)
                        }
                        if (c && s.departure) {
                            c.departure = extractTime(s.departure)
                        }
                    }
                }

                // Puis écraser avec les schedules spécifiques à l'événement (prioritaires)
                if (scheduleEventRes.data) {
                    for (const s of scheduleEventRes.data) {
                        const c = constraints.get(s.profile_id)
                        if (c && s.arrival) {
                            c.arrival = extractTime(s.arrival)
                        }
                        if (c && s.departure) {
                            c.departure = extractTime(s.departure)
                        }
                    }
                }

                // Absences générales (fallback)
                if (absencesGeneralRes.data) {
                    for (const a of absencesGeneralRes.data) {
                        const c = constraints.get(a.profile_id)
                        if (c && !c.unavailable.includes(a.absent_date)) {
                            c.unavailable.push(a.absent_date)
                        }
                    }
                }

                // Absences spécifiques à l'événement (prioritaires, ajoutées en plus)
                if (absencesEventRes.data) {
                    for (const a of absencesEventRes.data) {
                        const c = constraints.get(a.profile_id)
                        if (c && !c.unavailable.includes(a.absent_date)) {
                            c.unavailable.push(a.absent_date)
                        }
                    }
                }
            }

            // Log des contraintes utilisées
            const constraintsWithValues = Array.from(constraints.entries()).filter(
                ([, c]) => c.arrival || c.departure || c.unavailable.length > 0
            )
            if (constraintsWithValues.length > 0) {
                console.log("[Scheduler] Contraintes joueurs :")
                for (const [id, c] of constraintsWithValues) {
                    const parts: string[] = []
                    if (c.arrival) parts.push(`arrivée: ${c.arrival}`)
                    if (c.departure) parts.push(`départ: ${c.departure}`)
                    if (c.unavailable.length > 0) parts.push(`absences: ${c.unavailable.join(", ")}`)
                    console.log(`  - ${id}: ${parts.join(" | ")}`)
                }
            }

            // 2. Construire la map d'absences pour l'optimisation des byes
            const absencesMap = new Map<string, string[]>()
            for (const [id, c] of constraints.entries()) {
                if (c.unavailable.length > 0) {
                    absencesMap.set(id, c.unavailable)
                }
            }

            // 3. Générer les rounds structurés par groupe (avec optimisation bye/absence)
            const groupRounds = generateGroupRounds(groups, dates, absencesMap)

            // 4. Mapper les rounds sur les dates (round N → date N)
            const datePlans = mapRoundsToDates(groupRounds, dates)
            const totalPairings = datePlans.reduce((sum, p) => sum + p.pairings.length, 0)

            if (totalPairings === 0) {
                setError("Aucun match à générer (pas assez de joueurs dans les groupes)")
                return null
            }

            console.log(`[Scheduler] Génération: ${totalPairings} matchs, ${dates.length} dates, ${timeSlots.length} créneaux/jour, ${event.number_of_courts} terrains (${dates.length * timeSlots.length * event.number_of_courts} slots totaux)`)

            // 5. Assigner les créneaux horaires et terrains par date
            const assignments = assignTimeSlotsForDates(
                datePlans,
                timeSlots,
                event.number_of_courts,
                constraints,
                durationMin
            )

            if (assignments.length === 0) {
                setError(
                    `Pas assez de créneaux : aucun match placé sur ${totalPairings}. ` +
                    `Ajoutez des dates ou des terrains.`
                )
                return null
            }

            // 6. Insérer en batch dans Supabase
            const matchRows = assignments.map(a => ({
                group_id: a.groupId,
                player1_id: a.player1Id,
                player2_id: a.player2Id,
                match_date: a.matchDate,
                match_time: a.matchTime,
                court_number: a.courtNumber,
            }))

            const { error: insertError } = await supabase
                .from("matches")
                .insert(matchRows)

            if (insertError) {
                setError(insertError.message)
                return null
            }

            // 7. Refresh
            await fetchMatchesByEvent(event.id)

            const result = { total: totalPairings, placed: assignments.length }

            if (assignments.length < totalPairings) {
                setError(
                    `${assignments.length}/${totalPairings} matchs placés. ` +
                    `${totalPairings - assignments.length} match(s) sans créneau. Ajoutez des dates ou des terrains.`
                )
            }

            return result
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
            return null
        } finally {
            setLoading(false)
        }
    }

    const deleteMatchesByEvent = async (eventId: string) => {
        setError(null)

        try {
            // Récupérer les group IDs de l'event
            const { data: groups, error: groupsError } = await supabase
                .from("groups")
                .select("id")
                .eq("event_id", eventId)

            if (groupsError) {
                setError(groupsError.message)
                return false
            }

            if (!groups || groups.length === 0) return true

            const groupIds = groups.map(g => g.id)

            const { error: deleteError } = await supabase
                .from("matches")
                .delete()
                .in("group_id", groupIds)

            if (deleteError) {
                setError(deleteError.message)
                return false
            }

            setMatches([])
            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
            return false
        }
    }

    const applyEloUpdates = async (eloResults: EloMatchResult[]) => {
        try {
            const playerIds = new Set<string>()
            for (const r of eloResults) {
                playerIds.add(r.winnerId)
                playerIds.add(r.loserId)
            }

            const { data } = await supabase
                .from("profiles")
                .select("id, power_ranking")
                .in("id", Array.from(playerIds))

            if (!data) return

            const currentRatings = new Map<string, number>()
            for (const p of data) {
                if (p.power_ranking != null) {
                    currentRatings.set(p.id, p.power_ranking)
                }
            }

            const newRatings = computeEloUpdates(eloResults, currentRatings)

            if (newRatings.size === 0) return

            const updates = Array.from(newRatings.entries()).map(([id, rating]) =>
                supabase.from("profiles").update({ power_ranking: rating }).eq("id", id)
            )
            await Promise.all(updates)
        } catch (err) {
            console.warn("[Elo] Erreur mise à jour ratings:", err)
        }
    }

    const updateMatchResults = useCallback(async (
        results: { matchId: string; winnerId: string | null; score: string }[]
    ): Promise<boolean> => {
        if (results.length === 0) return true

        setError(null)

        try {
            const updates = results.map(({ matchId, winnerId, score }) =>
                supabase
                    .from("matches")
                    .update({ winner_id: winnerId, score, updated_at: new Date().toISOString() })
                    .eq("id", matchId)
            )

            const responses = await Promise.all(updates)

            const firstError = responses.find(r => r.error)
            if (firstError?.error) {
                setError(firstError.error.message)
                return false
            }

            // Mettre à jour le state local
            setMatches(prev => {
                const updated = prev.map(m => {
                    const update = results.find(r => r.matchId === m.id)
                    if (update) {
                        return { ...m, winner_id: update.winnerId, score: update.score }
                    }
                    return m
                })

                // Fire-and-forget : mise à jour Elo après save réussi
                const eloResults: EloMatchResult[] = results
                    .filter(r => r.winnerId !== null && r.score)
                    .map(r => {
                        const match = prev.find(m => m.id === r.matchId)
                        const loserId = match
                            ? (r.winnerId === match.player1_id ? match.player2_id : match.player1_id)
                            : ""
                        return {
                            matchId: r.matchId,
                            winnerId: r.winnerId!,
                            loserId,
                            score: r.score,
                        }
                    })
                    .filter(r => r.loserId !== "")

                if (eloResults.length > 0) {
                    applyEloUpdates(eloResults)
                }

                return updated
            })

            return true
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
            return false
        }
    }, [])

    return {
        matches,
        loading,
        error,
        fetchMatchesByEvent,
        generateMatches,
        deleteMatchesByEvent,
        updateMatchResults,
    }
}

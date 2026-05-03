import { supabase } from "@/lib/supabaseClient"
import type { Match } from "@/types/match"
import type { Group } from "@/types/draw"
import type { Event } from "@/types/event"
import type { UnplacedMatch } from "@/lib/matchScheduler"
import { useCallback, useState } from "react"
import { handleHookError, withTimeout } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"
import { intervalToMinutes } from "@/lib/utils"
import {
    generateGroupRounds,
    mapRoundsToDatesByTemplate,
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

/**
 * Normalise un score du point de vue du joueur vers le format DB (toujours player1-player2).
 * Ex: si isPlayer1=false et score="3-1" → "1-3" (inversé car c'est du point de vue player2)
 */
function normalizeScoreForDb(score: string, isPlayer1: boolean): string {
    if (score === "ABS") return isPlayer1 ? "ABS-0" : "0-ABS"
    if (isPlayer1) return score
    const parts = score.split("-")
    if (parts.length !== 2) return score
    return `${parts[1]}-${parts[0]}`
}

/**
 * Détermine le winner_id à partir d'un score normalisé (format player1-player2).
 */
function computeWinnerId(score: string, player1Id: string, player2Id: string): string | null {
    if (score.startsWith("ABS")) return player2Id
    if (score.endsWith("ABS")) return player1Id
    const parts = score.split("-").map(Number)
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
    return parts[0] > parts[1] ? player1Id : player2Id
}

export function useMatches() {

    const [matches, setMatches] = useState<Match[]>([])
    const [unplacedMatches, setUnplacedMatches] = useState<UnplacedMatch[]>([])
    const [playerConstraints, setPlayerConstraints] = useState<Map<string, PlayerConstraints>>(new Map())
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Récupère tous les matchs d'un événement avec les profils joueurs et le groupe.
     * Filtre via les groupes de l'événement puis charge les matchs triés par date/heure.
     */
    const fetchMatchesByEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) {
            setMatches([])
            return
        }

        setLoading(true)
        setError(null)
        const endLog = logger.start("useMatches.fetch")

        try {
            // Récupérer les groups de l'event pour filtrer
            const { data: groups, error: groupsError } = await withTimeout(
                supabase
                    .from("groups")
                    .select("id")
                    .eq("event_id", eventId),
                "useMatches.fetchGroups"
            )

            if (groupsError) {
                endLog({ error: groupsError.message })
                handleHookError(groupsError, setError, "useMatches.fetch")
                return
            }

            if (!groups || groups.length === 0) {
                setMatches([])
                endLog()
                return
            }

            const groupIds = groups.map(g => g.id)

            const { data, error: fetchError } = await withTimeout(
                supabase
                    .from("matches")
                    .select(`
                        *,
                        player1:profiles!matches_player1_id_fkey(id, first_name, last_name, avatar_url),
                        player2:profiles!matches_player2_id_fkey(id, first_name, last_name, avatar_url),
                        group:groups(id, group_name, event_id)
                    `)
                    .in("group_id", groupIds)
                    .order("match_date", { ascending: true })
                    .order("match_time", { ascending: true }),
                "useMatches.fetchMatches"
            )

            if (fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useMatches.fetch")
                return
            }

            setMatches((data as Match[]) || [])
            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            handleHookError(err, setError, "useMatches")
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

            // exposer les contraintes pour l'affichage (MatchScheduleGrid)
            setPlayerConstraints(constraints)

            // 2. Construire la map d'absences pour l'optimisation des byes
            const absencesMap = new Map<string, string[]>()
            for (const [id, c] of constraints.entries()) {
                if (c.unavailable.length > 0) {
                    absencesMap.set(id, c.unavailable)
                }
            }

            // 3. Générer les rounds structurés par groupe (avec optimisation bye/absence)
            const groupRounds = generateGroupRounds(groups, dates, absencesMap)

            // 4. Mapper les rounds sur les dates via le template de planification
            const datePlans = mapRoundsToDatesByTemplate(groupRounds, groups, dates)
            const totalPairings = datePlans.reduce((sum, p) => sum + p.pairings.length, 0)

            if (totalPairings === 0) {
                setError("Aucun match à générer (pas assez de joueurs dans les groupes)")
                return null
            }

            // 5. Assigner les créneaux horaires et terrains par date
            const { assignments, unplaced } = assignTimeSlotsForDates(
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
                handleHookError(insertError, setError, "useMatches.generate")
                return null
            }

            // 7. Refresh
            await fetchMatchesByEvent(event.id)

            setUnplacedMatches(unplaced)

            const result = { total: totalPairings, placed: assignments.length, unplaced }

            if (unplaced.length > 0) {
                const details = unplaced
                    .map(u => `${u.pairing.player1Name} vs ${u.pairing.player2Name} (${u.pairing.groupName}, ${u.date})`)
                    .join(", ")
                setError(
                    `${assignments.length}/${totalPairings} matchs placés. ` +
                    `${unplaced.length} match(s) sans créneau : ${details}. ` +
                    `Ajoutez des dates ou des terrains.`
                )
            }

            return result
        } catch (err) {
            handleHookError(err, setError, "useMatches")
            return null
        } finally {
            setLoading(false)
        }
    }

    /** Supprime tous les matchs d'un événement via ses groupes. */
    const deleteMatchesByEvent = async (eventId: string) => {
        setError(null)

        try {
            // Récupérer les group IDs de l'event
            const { data: groups, error: groupsError } = await supabase
                .from("groups")
                .select("id")
                .eq("event_id", eventId)

            if (groupsError) {
                handleHookError(groupsError, setError, "useMatches.delete")
                return false
            }

            if (!groups || groups.length === 0) return true

            const groupIds = groups.map(g => g.id)

            const { error: deleteError } = await supabase
                .from("matches")
                .delete()
                .in("group_id", groupIds)

            if (deleteError) {
                handleHookError(deleteError, setError, "useMatches.delete")
                return false
            }

            setMatches([])
            return true
        } catch (err) {
            handleHookError(err, setError, "useMatches")
            return false
        }
    }

    /**
     * Met à jour les résultats de plusieurs matchs en parallèle.
     * Applique les changements en local après succès pour un retour immédiat.
     */
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
                handleHookError(firstError.error, setError, "useMatches.updateResults")
                return false
            }

            // Mettre à jour le state local
            setMatches(prev =>
                prev.map(m => {
                    const update = results.find(r => r.matchId === m.id)
                    if (update) {
                        return { ...m, winner_id: update.winnerId, score: update.score }
                    }
                    return m
                })
            )

            return true
        } catch (err) {
            handleHookError(err, setError, "useMatches")
            return false
        }
    }, [])

    /**
     * Recalcule les Elo de tous les joueurs d'un événement en batch.
     * Récupère tous les matchs terminés, calcule les deltas depuis les ratings initiaux,
     * et met à jour les profiles. Retourne le nombre de joueurs mis à jour.
     */
    const applyEventElo = async (eventId: string): Promise<number> => {
        setError(null)

        try {
            // 1. Récupérer les groupes de l'event
            const { data: groups, error: groupsError } = await supabase
                .from("groups")
                .select("id")
                .eq("event_id", eventId)

            if (groupsError) {
                handleHookError(groupsError, setError, "useMatches.applyEventElo")
                return 0
            }

            if (!groups || groups.length === 0) return 0

            const groupIds = groups.map(g => g.id)

            // 2. Récupérer tous les matchs terminés (avec winner_id)
            const { data: completedMatches, error: matchesError } = await supabase
                .from("matches")
                .select("id, player1_id, player2_id, winner_id, score")
                .in("group_id", groupIds)
                .not("winner_id", "is", null)

            if (matchesError) {
                handleHookError(matchesError, setError, "useMatches.applyEventElo")
                return 0
            }

            if (!completedMatches || completedMatches.length === 0) return 0

            // 3. Construire les EloMatchResults
            const eloResults: EloMatchResult[] = completedMatches
                .filter(m => m.winner_id && m.score)
                .map(m => ({
                    matchId: m.id,
                    winnerId: m.winner_id!,
                    loserId: m.winner_id === m.player1_id ? m.player2_id : m.player1_id,
                    score: m.score!,
                }))

            if (eloResults.length === 0) return 0

            // 4. Récupérer les ratings actuels des joueurs concernés
            const playerIds = new Set<string>()
            for (const r of eloResults) {
                playerIds.add(r.winnerId)
                playerIds.add(r.loserId)
            }

            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, power_ranking")
                .in("id", Array.from(playerIds))

            if (profilesError) {
                handleHookError(profilesError, setError, "useMatches.applyEventElo")
                return 0
            }

            if (!profiles) return 0

            const currentRatings = new Map<string, number>()
            for (const p of profiles) {
                if (p.power_ranking != null) {
                    currentRatings.set(p.id, p.power_ranking)
                }
            }

            // 5. Calcul batch des nouveaux ratings
            const newRatings = computeEloUpdates(eloResults, currentRatings)

            if (newRatings.size === 0) return 0

            // 6. Mise à jour en base
            const profileUpdates = Array.from(newRatings.entries()).map(([id, rating]) =>
                supabase.from("profiles").update({ power_ranking: rating }).eq("id", id)
            )

            const responses = await Promise.all(profileUpdates)
            const updateError = responses.find(r => r.error)
            if (updateError?.error) {
                handleHookError(updateError.error, setError, "useMatches.applyEventElo")
                return 0
            }

            return newRatings.size
        } catch (err) {
            handleHookError(err, setError, "useMatches.applyEventElo")
            return 0
        }
    }

    /**
     * Cloture un evenement : verifie que tous les matchs sont joues,
     * puis passe le statut a 'completed'.
     * L'ELO est applique automatiquement par le trigger trg_auto_elo_on_event_complete.
     */
    const closeEvent = async (eventId: string): Promise<{ success: boolean }> => {
        setError(null)

        try {
            // 1. Recuperer les groupes de l'event
            const { data: groups, error: groupsError } = await supabase
                .from("groups")
                .select("id")
                .eq("event_id", eventId)

            if (groupsError) {
                handleHookError(groupsError, setError, "useMatches.closeEvent")
                return { success: false }
            }

            if (!groups || groups.length === 0) {
                setError("Aucun groupe pour cet événement")
                return { success: false }
            }

            const groupIds = groups.map(g => g.id)

            // 2. Recuperer tous les matchs et verifier qu'ils sont tous joues
            const { data: allMatches, error: matchesError } = await supabase
                .from("matches")
                .select("id, winner_id")
                .in("group_id", groupIds)

            if (matchesError) {
                handleHookError(matchesError, setError, "useMatches.closeEvent")
                return { success: false }
            }

            if (!allMatches || allMatches.length === 0) {
                setError("Aucun match dans cet événement")
                return { success: false }
            }

            const incomplete = allMatches.filter(m => !m.winner_id)
            if (incomplete.length > 0) {
                setError(`${incomplete.length} match(s) sans résultat. Complétez tous les matchs avant de clôturer.`)
                return { success: false }
            }

            // 3. Passer le statut a 'completed' (le trigger applique l'ELO automatiquement)
            const { error: statusError } = await supabase
                .from("events")
                .update({ status: "completed" })
                .eq("id", eventId)

            if (statusError) {
                handleHookError(statusError, setError, "useMatches.closeEvent")
                return { success: false }
            }

            return { success: true }
        } catch (err) {
            handleHookError(err, setError, "useMatches.closeEvent")
            return { success: false }
        }
    }

    /** Met à jour le créneau (date, heure, terrain) d'un match. */
    const updateMatchSchedule = useCallback(async (
        matchId: string,
        updates: { match_date?: string; match_time?: string; court_number?: string }
    ): Promise<boolean> => {
        setError(null)

        try {
            const { error: updateError } = await supabase
                .from("matches")
                .update(updates)
                .eq("id", matchId)

            if (updateError) {
                handleHookError(updateError, setError, "useMatches.updateSchedule")
                return false
            }

            setMatches(prev =>
                prev.map(m => m.id === matchId ? { ...m, ...updates } : m)
            )

            return true
        } catch (err) {
            handleHookError(err, setError, "useMatches.updateSchedule")
            return false
        }
    }, [])

    /**
     * Soumet un score en attente de confirmation par l'adversaire.
     * Relit le match depuis Supabase pour éviter les stale closures.
     * Si l'adversaire a déjà soumis le même score → validé automatiquement.
     * Si scores différents → conflit (les deux pending restent, admin tranche).
     */
    const submitPendingScore = useCallback(async (
        matchId: string,
        playerId: string,
        score: string
    ): Promise<"confirmed" | "pending" | "conflict" | false> => {
        setError(null)

        try {
            // Relire le match depuis Supabase pour avoir l'état le plus récent
            const { data: freshMatch, error: fetchErr } = await supabase
                .from("matches")
                .select("id, player1_id, player2_id, pending_score_p1, pending_score_p2")
                .eq("id", matchId)
                .single()

            if (fetchErr || !freshMatch) {
                setError("Match introuvable")
                return false
            }

            const isPlayer1 = freshMatch.player1_id === playerId
            const normalizedScore = normalizeScoreForDb(score, isPlayer1)
            const otherPendingScore = isPlayer1 ? freshMatch.pending_score_p2 : freshMatch.pending_score_p1

            const now = new Date().toISOString()
            const myField = isPlayer1 ? "pending_score_p1" : "pending_score_p2"

            // L'autre joueur a déjà soumis un score
            if (otherPendingScore) {
                if (otherPendingScore === normalizedScore) {
                    // Même score → valider le match
                    const winnerId = computeWinnerId(normalizedScore, freshMatch.player1_id, freshMatch.player2_id)
                    const { error: updateError } = await supabase
                        .from("matches")
                        .update({
                            [myField]: normalizedScore,
                            score: normalizedScore,
                            winner_id: winnerId,
                            pending_at: null,
                            pending_by: null,
                            updated_at: now,
                        })
                        .eq("id", matchId)

                    if (updateError) {
                        handleHookError(updateError, setError, "useMatches.submitPending")
                        return false
                    }

                    setMatches(prev => prev.map(m =>
                        m.id === matchId
                            ? { ...m, [myField]: normalizedScore, score: normalizedScore, winner_id: winnerId, pending_at: null, pending_by: null }
                            : m
                    ))
                    return "confirmed"
                } else {
                    // Scores différents → conflit
                    const { error: updateError } = await supabase
                        .from("matches")
                        .update({ [myField]: normalizedScore, updated_at: now })
                        .eq("id", matchId)

                    if (updateError) {
                        handleHookError(updateError, setError, "useMatches.submitPending")
                        return false
                    }

                    setMatches(prev => prev.map(m =>
                        m.id === matchId ? { ...m, [myField]: normalizedScore } : m
                    ))
                    return "conflict"
                }
            }

            // Premier à soumettre → pending
            const { error: updateError } = await supabase
                .from("matches")
                .update({
                    [myField]: normalizedScore,
                    pending_at: now,
                    pending_by: playerId,
                    updated_at: now,
                })
                .eq("id", matchId)

            if (updateError) {
                handleHookError(updateError, setError, "useMatches.submitPending")
                return false
            }

            setMatches(prev => prev.map(m =>
                m.id === matchId
                    ? { ...m, [myField]: normalizedScore, pending_at: now, pending_by: playerId }
                    : m
            ))
            return "pending"
        } catch (err) {
            handleHookError(err, setError, "useMatches.submitPending")
            return false
        }
    }, [])

    return {
        matches,
        unplacedMatches,
        playerConstraints,
        loading,
        error,
        fetchMatchesByEvent,
        generateMatches,
        deleteMatchesByEvent,
        updateMatchResults,
        updateMatchSchedule,
        submitPendingScore,
        applyEventElo,
        closeEvent,
    }
}

import { supabase } from "@/lib/supabaseClient"
import type { Match } from "@/types/match"
import type { Group } from "@/types/draw"
import type { Event } from "@/types/event"
import { useCallback, useState } from "react"
import { intervalToMinutes } from "@/lib/utils"
import {
    generateRoundRobinPairings,
    calculateTimeSlots,
    calculateDates,
    assignMatchesToSlots,
    type PlayerConstraints,
} from "@/lib/matchScheduler"

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

    const generateMatches = async (event: Event, groups: Group[]) => {
        setLoading(true)
        setError(null)

        try {
            // 1. Générer les paires round-robin
            const pairings = generateRoundRobinPairings(groups)

            if (pairings.length === 0) {
                setError("Aucun match à générer (pas assez de joueurs dans les groupes)")
                return
            }

            // 2. Calculer les créneaux
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

                const [scheduleRes, absencesRes] = await Promise.all([
                    supabase
                        .from("schedule")
                        .select("profile_id, arrival, departure")
                        .eq("event_id", event.id)
                        .in("profile_id", ids),
                    supabase
                        .from("absences")
                        .select("profile_id, absent_date")
                        .eq("event_id", event.id)
                        .in("profile_id", ids),
                ])

                // Construire la map de contraintes
                for (const id of ids) {
                    constraints.set(id, { arrival: "", departure: "", unavailable: [] })
                }

                if (scheduleRes.data) {
                    for (const s of scheduleRes.data) {
                        const c = constraints.get(s.profile_id)
                        if (c && s.arrival) {
                            const arrivalDate = new Date(s.arrival)
                            c.arrival = arrivalDate.toLocaleTimeString('fr-FR', {
                                hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'
                            })
                        }
                        if (c && s.departure) {
                            const departureDate = new Date(s.departure)
                            c.departure = departureDate.toLocaleTimeString('fr-FR', {
                                hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'
                            })
                        }
                    }
                }

                if (absencesRes.data) {
                    for (const a of absencesRes.data) {
                        const c = constraints.get(a.profile_id)
                        if (c) {
                            c.unavailable.push(a.absent_date)
                        }
                    }
                }
            }

            // 4. Assigner aux créneaux avec contraintes
            const assignments = assignMatchesToSlots(
                pairings,
                dates,
                timeSlots,
                event.number_of_courts,
                constraints,
                durationMin
            )

            if (assignments.length < pairings.length) {
                setError(
                    `Pas assez de créneaux : ${assignments.length}/${pairings.length} matchs placés. ` +
                    `Ajoutez des dates ou des terrains.`
                )
                // On insère quand même les matchs qu'on a pu placer
                if (assignments.length === 0) return
            }

            // 4. Insérer en batch dans Supabase
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
                return
            }

            // 5. Refresh
            await fetchMatchesByEvent(event.id)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
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

    return {
        matches,
        loading,
        error,
        fetchMatchesByEvent,
        generateMatches,
        deleteMatchesByEvent,
    }
}

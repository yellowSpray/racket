import { supabase } from "@/lib/supabaseClient"
import type { Event } from "@/types/event"
import { transformGroups, type Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useCallback, useState } from "react"
import { logger } from "@/lib/logger"
import { sortGroupsByName } from "@/lib/utils"

export function usePreviousEvent() {
    const [previousEvent, setPreviousEvent] = useState<Event | null>(null)
    const [previousGroups, setPreviousGroups] = useState<Group[]>([])
    const [previousMatches, setPreviousMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(false)

    /**
     * Récupère l'événement précédent d'un club avec ses groupes, joueurs et matchs.
     * Exclut l'événement courant et prend le round le plus récent par end_date.
     */
    const fetchPreviousEvent = useCallback(async (clubId: string | null, currentEventId: string | null) => {
        if (!clubId) {
            setPreviousEvent(null)
            setPreviousGroups([])
            setPreviousMatches([])
            return
        }

        setLoading(true)
        const endLog = logger.start("usePreviousEvent.fetch")

        try {
            // Fetch the most recent event for this club (excluding current), via its most recent round's end_date
            let query = supabase
                .from("events")
                .select("*, event_rounds(*)")
                .eq("club_id", clubId)

            if (currentEventId) {
                query = query.neq("id", currentEventId)
            }

            const { data: eventsData } = await query

            if (!eventsData || eventsData.length === 0) {
                setPreviousEvent(null)
                setPreviousGroups([])
                setPreviousMatches([])
                return
            }

            // Find the event whose most recent round has the latest end_date
            const sorted = eventsData
                .map(e => {
                    const rounds = (e.event_rounds ?? []) as { id: string; end_date: string; round_number: number; status: string }[]
                    const latestRound = rounds.sort((a, b) => b.round_number - a.round_number)[0]
                    return { event: e, latestRound }
                })
                .filter(x => x.latestRound)
                .sort((a, b) => (b.latestRound!.end_date ?? "").localeCompare(a.latestRound!.end_date ?? ""))

            if (sorted.length === 0) {
                setPreviousEvent(null)
                setPreviousGroups([])
                setPreviousMatches([])
                return
            }

            const { event: eventData, latestRound } = sorted[0]
            setPreviousEvent(eventData)

            // Fetch groups with players for the latest round
            const { data: groupsData } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("round_id", latestRound!.id)
                .order("group_name")

            const groups = groupsData ? sortGroupsByName(transformGroups(groupsData)) : []
            setPreviousGroups(groups)

            // Fetch matches if groups exist
            if (groups.length > 0) {
                const groupIds = groups.map(g => g.id)
                const { data: matchesData } = await supabase
                    .from("matches")
                    .select(`
                        *,
                        player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
                        player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
                        group:groups(id, group_name, round_id)
                    `)
                    .in("group_id", groupIds)
                    .order("match_date")
                    .order("match_time")

                setPreviousMatches(matchesData || [])
            } else {
                setPreviousMatches([])
            }
            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            setPreviousEvent(null)
            setPreviousGroups([])
            setPreviousMatches([])
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        previousEvent,
        previousGroups,
        previousMatches,
        loading,
        fetchPreviousEvent,
    }
}


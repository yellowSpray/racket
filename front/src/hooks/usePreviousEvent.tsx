import { supabase } from "@/lib/supabaseClient"
import type { Event } from "@/types/event"
import type { Group, SupabaseGroup } from "@/types/draw"
import type { Match } from "@/types/match"
import { useCallback, useState } from "react"
import { logger } from "@/lib/logger"

export function usePreviousEvent() {
    const [previousEvent, setPreviousEvent] = useState<Event | null>(null)
    const [previousGroups, setPreviousGroups] = useState<Group[]>([])
    const [previousMatches, setPreviousMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(false)

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
            // Fetch the most recent event for this club (excluding current)
            let query = supabase
                .from("events")
                .select("*")
                .eq("club_id", clubId)
                .order("end_date", { ascending: false })
                .limit(1)

            if (currentEventId) {
                query = query.neq("id", currentEventId)
            }

            const { data: eventData } = await query.maybeSingle()

            if (!eventData) {
                setPreviousEvent(null)
                setPreviousGroups([])
                setPreviousMatches([])
                return
            }

            setPreviousEvent(eventData)

            // Fetch groups with players
            const { data: groupsData } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("event_id", eventData.id)
                .order("group_name")

            const groups = groupsData ? transformGroups(groupsData) : []
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
                        group:groups(id, group_name, event_id)
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

function transformGroups(data: SupabaseGroup[]): Group[] {
    return data.map(g => ({
        id: g.id,
        event_id: g.event_id,
        group_name: g.group_name,
        max_players: g.max_players,
        created_at: g.created_at,
        players: (g.group_players || [])
            .filter(gp => gp.profiles)
            .map(gp => ({
                id: gp.profiles.id,
                first_name: gp.profiles.first_name,
                last_name: gp.profiles.last_name,
                phone: gp.profiles.phone,
                power_ranking: gp.profiles.power_ranking ?? 0,
            })),
    }))
}

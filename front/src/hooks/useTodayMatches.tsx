import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Match } from "@/types/match"
import { withTimeout } from "@/lib/handleHookError"

/** Retourne la date du jour au format YYYY-MM-DD. */
function getToday(): string {
    return new Date().toISOString().slice(0, 10)
}

/**
 * Charge les matchs du jour pour un événement, ou ceux de la prochaine
 * date de jeu si aucun match n'est prévu aujourd'hui.
 * Se recharge automatiquement quand eventId change.
 */
export function useTodayMatches(eventId: string | null) {
    const [matches, setMatches] = useState<Match[]>([])
    const [matchDate, setMatchDate] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [isToday, setIsToday] = useState(false)

    /**
     * Récupère les matchs du jour. S'il n'y en a pas, cherche la prochaine
     * date de jeu et charge les matchs correspondants.
     */
    const fetchTodayMatches = useCallback(async () => {
        if (!eventId) {
            setMatches([])
            setMatchDate(null)
            setIsToday(false)
            return
        }

        setLoading(true)

        try {
            // 1. Get groups for this event
            const { data: groups, error: groupsError } = await withTimeout(
                supabase
                    .from("groups")
                    .select("id")
                    .eq("event_id", eventId),
                "useTodayMatches.groups"
            )

            if (groupsError || !groups || groups.length === 0) {
                setMatches([])
                setMatchDate(null)
                setIsToday(false)
                setLoading(false)
                return
            }

            const groupIds = groups.map((g: { id: string }) => g.id)
            const today = getToday()

            // 2. Fetch today's matches
            const { data: todayData, error: todayError } = await withTimeout(
                supabase
                    .from("matches")
                    .select(`
                        *,
                        player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
                        player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
                        group:groups(id, group_name, event_id)
                    `)
                    .in("group_id", groupIds)
                    .eq("match_date", today)
                    .order("match_time", { ascending: true }),
                "useTodayMatches.todayMatches"
            )

            if (todayError) {
                setMatches([])
                setMatchDate(null)
                setLoading(false)
                return
            }

            if (todayData && todayData.length > 0) {
                setMatches(todayData as Match[])
                setMatchDate(today)
                setIsToday(true)
                setLoading(false)
                return
            }

            // 3. No matches today — find next date
            const { data: nextMatch, error: nextError } = await withTimeout(
                supabase
                    .from("matches")
                    .select("match_date")
                    .in("group_id", groupIds)
                    .gte("match_date", today)
                    .order("match_date", { ascending: true })
                    .limit(1),
                "useTodayMatches.nextDate"
            )

            if (nextError || !nextMatch || nextMatch.length === 0) {
                setMatches([])
                setMatchDate(null)
                setIsToday(false)
                setLoading(false)
                return
            }

            const nextDate = nextMatch[0].match_date

            // 4. Fetch matches for next date
            const { data: nextData, error: nextDataError } = await withTimeout(
                supabase
                    .from("matches")
                    .select(`
                        *,
                        player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
                        player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
                        group:groups(id, group_name, event_id)
                    `)
                    .in("group_id", groupIds)
                    .eq("match_date", nextDate)
                    .order("match_time", { ascending: true }),
                "useTodayMatches.nextMatches"
            )

            if (nextDataError) {
                setMatches([])
                setMatchDate(null)
                setLoading(false)
                return
            }

            setMatches((nextData as Match[]) || [])
            setMatchDate(nextDate)
            setIsToday(nextDate === today)
        } catch {
            setMatches([])
            setMatchDate(null)
        } finally {
            setLoading(false)
        }
    }, [eventId])

    useEffect(() => {
        fetchTodayMatches()
    }, [fetchTodayMatches])

    return { matches, matchDate, loading, isToday, refetch: fetchTodayMatches }
}

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Match } from "@/types/match"

export type DayMatchStatus = "done" | "no_score" | "waiting_one" | "conflict"

export interface DayMatch extends Match {
    status: DayMatchStatus
}

export interface MatchDay {
    date: string
    label: string
    isToday: boolean
    matches: DayMatch[]
}

function getToday(): string {
    return new Date().toISOString().slice(0, 10)
}

function formatDayLabel(date: string): string {
    const d = new Date(`${date}T12:00:00`)
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

function classifyMatch(match: Match): DayMatchStatus {
    if (match.winner_id !== null) return "done"
    const p1 = match.pending_score_p1 ?? null
    const p2 = match.pending_score_p2 ?? null
    if (p1 !== null && p2 !== null && p1 !== p2) return "conflict"
    if (p1 !== null || p2 !== null) return "waiting_one"
    return "no_score"
}

function groupByDay(matches: DayMatch[]): MatchDay[] {
    const today = getToday()
    const map = new Map<string, DayMatch[]>()
    for (const m of matches) {
        const arr = map.get(m.match_date) ?? []
        arr.push(m)
        map.set(m.match_date, arr)
    }
    return Array.from(map.entries()).map(([date, ms]) => ({
        date,
        label: formatDayLabel(date),
        isToday: date === today,
        matches: ms,
    }))
}

function computeWinnerId(score: string, player1Id: string, player2Id: string): string | null {
    if (!score) return null
    if (score.startsWith("ABS")) return player2Id
    if (score.endsWith("ABS")) return player1Id
    const parts = score.split("-").map(Number)
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
    return parts[0] > parts[1] ? player1Id : player2Id
}

/**
 * Charge tous les matchs d'un événement, groupés par jour.
 * Inclut les matchs terminés (pour affichage du planning complet) et les matchs
 * en attente (pour saisie de score). Détermine automatiquement le jour initial
 * à afficher (aujourd'hui ou le prochain jour planifié).
 */
export function useMatchesByDay(eventId: string | null) {
    const [days, setDays] = useState<MatchDay[]>([])
    const [loading, setLoading] = useState(false)
    const [initialDayIndex, setInitialDayIndex] = useState(0)

    const fetchMatches = useCallback(async () => {
        if (!eventId) {
            setDays([])
            setInitialDayIndex(0)
            return
        }

        setLoading(true)

        const { data: groups, error: groupsError } = await supabase
            .from("groups")
            .select("id")
            .eq("event_id", eventId)

        if (groupsError || !groups || groups.length === 0) {
            setDays([])
            setLoading(false)
            return
        }

        const groupIds = (groups as { id: string }[]).map(g => g.id)

        const { data, error: matchesError } = await supabase
            .from("matches")
            .select(`
                *,
                player1:profiles!matches_player1_id_fkey(id, first_name, last_name, avatar_url),
                player2:profiles!matches_player2_id_fkey(id, first_name, last_name, avatar_url),
                group:groups(id, group_name, event_id)
            `)
            .in("group_id", groupIds)
            .order("match_date", { ascending: true })
            .order("match_time", { ascending: true })

        if (matchesError) {
            setDays([])
            setLoading(false)
            return
        }

        const classified: DayMatch[] = (data ?? []).map((m: Match) => ({
            ...m,
            status: classifyMatch(m),
        }))

        const grouped = groupByDay(classified)
        const today = getToday()
        const todayIdx = grouped.findIndex(d => d.date === today)
        const nextIdx = grouped.findIndex(d => d.date >= today)
        const initialIdx = todayIdx >= 0 ? todayIdx : nextIdx >= 0 ? nextIdx : 0

        setDays(grouped)
        setInitialDayIndex(initialIdx)
        setLoading(false)
    }, [eventId])

    useEffect(() => {
        fetchMatches()
    }, [fetchMatches])

    const resolveScore = useCallback(async (
        matchId: string,
        score: string,
        player1Id: string,
        player2Id: string,
    ): Promise<boolean> => {
        const winnerId = computeWinnerId(score, player1Id, player2Id)

        const { error } = await supabase
            .from("matches")
            .update({
                score,
                winner_id: winnerId,
                pending_score_p1: null,
                pending_score_p2: null,
                pending_at: null,
                pending_by: null,
            })
            .eq("id", matchId)

        if (error) return false

        setDays(prev => prev.map(day => ({
            ...day,
            matches: day.matches.map(m =>
                m.id === matchId
                    ? { ...m, status: "done" as DayMatchStatus, score, winner_id: winnerId }
                    : m
            ),
        })))

        return true
    }, [])

    return { days, loading, initialDayIndex, resolveScore, refetch: fetchMatches }
}

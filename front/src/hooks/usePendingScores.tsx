import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Match } from "@/types/match"

export type PendingMatchStatus = "no_score" | "waiting_one" | "conflict"

export interface PendingMatch extends Match {
    status: PendingMatchStatus
}

export interface PendingDay {
    date: string
    label: string
    matches: PendingMatch[]
}

function classifyMatch(match: Match): PendingMatchStatus {
    const p1 = match.pending_score_p1 ?? null
    const p2 = match.pending_score_p2 ?? null
    if (p1 !== null && p2 !== null && p1 !== p2) return "conflict"
    if (p1 !== null || p2 !== null) return "waiting_one"
    return "no_score"
}

/** Détermine le winner_id à partir d'un score normalisé (format player1-player2). */
function computeWinnerId(score: string, player1Id: string, player2Id: string): string | null {
    if (!score) return null
    if (score.startsWith("ABS")) return player2Id
    if (score.endsWith("ABS")) return player1Id
    const parts = score.split("-").map(Number)
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
    return parts[0] > parts[1] ? player1Id : player2Id
}

function formatDayLabel(date: string): string {
    const d = new Date(`${date}T12:00:00`)
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

function groupByDay(matches: PendingMatch[]): PendingDay[] {
    const map = new Map<string, PendingMatch[]>()
    for (const m of matches) {
        const arr = map.get(m.match_date) ?? []
        arr.push(m)
        map.set(m.match_date, arr)
    }
    return Array.from(map.entries()).map(([date, ms]) => ({
        date,
        label: formatDayLabel(date),
        matches: ms,
    }))
}

/**
 * Récupère les matchs sans score confirmé pour un événement, groupés par jour.
 * Permet à l'admin de saisir les scores manquants et résoudre les conflits.
 */
export function usePendingScores(eventId: string | null) {
    const [days, setDays] = useState<PendingDay[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchPendingScores = useCallback(async () => {
        if (!eventId) {
            setDays([])
            return
        }

        setLoading(true)
        setError(null)

        // Étape 1 : récupérer les group IDs de l'event
        const { data: groups, error: groupsError } = await supabase
            .from("groups")
            .select("id")
            .eq("event_id", eventId)

        if (groupsError) {
            setError(groupsError.message)
            setDays([])
            setLoading(false)
            return
        }

        if (!groups || groups.length === 0) {
            setDays([])
            setLoading(false)
            return
        }

        const groupIds = (groups as { id: string }[]).map(g => g.id)

        // Étape 2 : récupérer les matchs sans score confirmé
        const { data, error: matchesError } = await supabase
            .from("matches")
            .select(`
                *,
                player1:profiles!matches_player1_id_fkey(id, first_name, last_name, avatar_url),
                player2:profiles!matches_player2_id_fkey(id, first_name, last_name, avatar_url),
                group:groups(id, group_name, event_id)
            `)
            .in("group_id", groupIds)
            .is("winner_id", null)
            .order("match_date", { ascending: true })
            .order("match_time", { ascending: true })

        if (matchesError) {
            setError(matchesError.message)
            setDays([])
            setLoading(false)
            return
        }

        const classified: PendingMatch[] = (data ?? []).map((m: Match) => ({
            ...m,
            status: classifyMatch(m),
        }))

        setDays(groupByDay(classified))
        setLoading(false)
    }, [eventId])

    useEffect(() => {
        fetchPendingScores()
    }, [fetchPendingScores])

    /**
     * Valide un score pour un match : confirme le score, efface les pending.
     * Mise à jour optimiste de l'état local (pas de re-fetch réseau).
     */
    const resolveScore = useCallback(async (
        matchId: string,
        score: string,
        player1Id: string,
        player2Id: string,
    ): Promise<boolean> => {
        const winnerId = computeWinnerId(score, player1Id, player2Id)

        const { error: err } = await supabase
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

        if (err) return false

        setDays(prev =>
            prev
                .map(day => ({ ...day, matches: day.matches.filter(m => m.id !== matchId) }))
                .filter(day => day.matches.length > 0)
        )
        return true
    }, [])

    return { days, loading, error, resolveScore }
}

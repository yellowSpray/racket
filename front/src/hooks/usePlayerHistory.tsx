import { supabase } from "@/lib/supabaseClient"
import { useCallback, useState } from "react"

export interface EventHistoryEntry {
    id: string
    event_name: string
    start_date: string
    wins: number
    losses: number
    total: number
    anecdote?: string
}

interface RawEventPlayer {
    event_id: string
    events: {
        id: string
        event_name: string
        start_date: string
    }
}

interface RawMatch {
    winner_id: string | null
    player1_id: string
    player2_id: string
    group: { event_id: string } | null
}

export function usePlayerHistory() {
    const [history, setHistory] = useState<EventHistoryEntry[]>([])
    const [loading, setLoading] = useState(false)

    const fetchHistory = useCallback(async (profileId: string) => {
        if (!profileId) { setHistory([]); return }
        setLoading(true)

        try {
            // 1. Toutes les séries auxquelles le joueur a participé
            const { data: epData, error: epError } = await supabase
                .from("event_players")
                .select("event_id, events!inner(id, event_name, start_date)")
                .eq("profile_id", profileId)

            if (epError || !epData?.length) { setHistory([]); return }

            const eventPlayers = epData as unknown as RawEventPlayer[]
            const eventIdSet = new Set(eventPlayers.map(ep => ep.event_id))

            // 2. Tous les matchs terminés du joueur
            const { data: matchData } = await supabase
                .from("matches")
                .select("winner_id, player1_id, player2_id, group:groups!inner(event_id)")
                .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
                .not("winner_id", "is", null)

            const matches = (matchData ?? []) as unknown as RawMatch[]

            // Statistiques par événement
            const statsMap = new Map<string, { wins: number; losses: number }>()
            for (const m of matches) {
                const eventId = m.group?.event_id
                if (!eventId || !eventIdSet.has(eventId)) continue
                if (!statsMap.has(eventId)) statsMap.set(eventId, { wins: 0, losses: 0 })
                const s = statsMap.get(eventId)!
                if (m.winner_id === profileId) s.wins++
                else s.losses++
            }

            // Entrées triées par date croissante
            const entries: EventHistoryEntry[] = eventPlayers
                .sort((a, b) => a.events.start_date.localeCompare(b.events.start_date))
                .map(ep => {
                    const stats = statsMap.get(ep.event_id) ?? { wins: 0, losses: 0 }
                    return {
                        id: ep.event_id,
                        event_name: ep.events.event_name,
                        start_date: ep.events.start_date,
                        wins: stats.wins,
                        losses: stats.losses,
                        total: stats.wins + stats.losses,
                    }
                })

            // Anecdotes
            const maxWins = Math.max(...entries.map(e => e.wins), 0)
            entries.forEach((entry, i) => {
                if (i === 0) { entry.anecdote = "Première série"; return }
                if (entry.total > 0 && entry.losses === 0) { entry.anecdote = "Invaincu"; return }
                const prev = entries[i - 1]
                const rate = entry.total > 0 ? entry.wins / entry.total : 0
                const prevRate = prev && prev.total > 0 ? prev.wins / prev.total : 0
                if (entry.total >= 2 && rate >= 0.66 && rate > prevRate) { entry.anecdote = "Montée"; return }
                if (entry.total >= 2 && rate <= 0.33 && rate < prevRate) { entry.anecdote = "Descente"; return }
                if (entry.wins === maxWins && entry.wins > 0) { entry.anecdote = "Meilleure série"; return }
                if (prev && entry.wins > prev.wins) { entry.anecdote = "En progression"; return }
            })

            setHistory(entries)
        } catch {
            setHistory([])
        } finally {
            setLoading(false)
        }
    }, [])

    return { history, loading, fetchHistory }
}

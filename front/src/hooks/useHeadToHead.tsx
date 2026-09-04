import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { logger } from "@/lib/logger"
import { summarizeHeadToHead, type HeadToHeadSummary } from "@/lib/matchScore"
import type { Match } from "@/types/match"

const EMPTY_SUMMARY: HeadToHeadSummary = { played: 0, wins: 0, losses: 0 }

/**
 * Historique des confrontations entre deux joueurs, toutes séries et tous
 * événements confondus.
 *
 * Aucun filtre de club n'est nécessaire : un joueur appartient à un club, donc
 * une paire de joueurs ne peut s'être rencontrée que dans ce club.
 */
export function useHeadToHead() {
    const [matches, setMatches] = useState<Match[]>([])
    const [summary, setSummary] = useState<HeadToHeadSummary>(EMPTY_SUMMARY)
    const [loading, setLoading] = useState(false)

    const reset = () => {
        setMatches([])
        setSummary(EMPTY_SUMMARY)
    }

    /**
     * @param playerId - joueur dont on veut le bilan
     * @param opponentId - son adversaire
     * @param excludeMatchId - match en cours d'édition, exclu de son propre historique
     */
    const fetchHistory = useCallback(async (
        playerId: string | null,
        opponentId: string | null,
        excludeMatchId?: string,
    ) => {
        if (!playerId || !opponentId) {
            reset()
            return
        }

        setLoading(true)
        const endLog = logger.start("useHeadToHead.fetch")

        try {
            const { data, error } = await supabase
                .from("matches")
                .select(`
                    *,
                    group:groups(
                        id, group_name, round_id,
                        event_rounds(round_number, event_id, events(event_name))
                    )
                `)
                // Les deux ordres possibles : le joueur peut être player1 ou player2
                .or(
                    `and(player1_id.eq.${playerId},player2_id.eq.${opponentId}),` +
                    `and(player1_id.eq.${opponentId},player2_id.eq.${playerId})`
                )
                .order("match_date", { ascending: false })

            if (error || !data) {
                endLog({ error: error?.message })
                reset()
                return
            }

            const history = (data as Match[]).filter(m => m.id !== excludeMatchId)
            setMatches(history)
            setSummary(summarizeHeadToHead(history, playerId))
            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            reset()
        } finally {
            setLoading(false)
        }
    }, [])

    return { matches, summary, loading, fetchHistory, reset }
}

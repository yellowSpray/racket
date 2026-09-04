import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { logger } from "@/lib/logger"
import { buildPlayerHistory, type PlayerHistoryEntry, type PlayerHistoryRow } from "@/lib/playerBoxHistory"

/** Forme brute de la jointure group_players > groups > event_rounds > events. */
interface RawRow {
    groups: {
        group_name: string
        event_rounds: {
            round_number: number
            start_date: string
            events: { event_name: string } | null
        } | null
    } | null
}

/**
 * Parcours d'un joueur en tableaux, toutes séries et tous événements confondus.
 *
 * À ne pas confondre avec `usePlayerHistory`, qui compte les victoires et les
 * défaites par événement pour la carte d'évolution côté joueur. Ici on suit les
 * tableaux occupés et les montées ou descentes entre eux.
 *
 * Aucun filtre de club n'est nécessaire : un joueur appartient à un club, donc
 * ses passages ne peuvent venir que des événements de ce club.
 */
export function usePlayerBoxHistory() {
    const [history, setHistory] = useState<PlayerHistoryEntry[]>([])
    const [loading, setLoading] = useState(false)

    const reset = () => setHistory([])

    const fetchHistory = useCallback(async (playerId: string | null) => {
        if (!playerId) {
            reset()
            return
        }

        setLoading(true)
        const endLog = logger.start("usePlayerBoxHistory.fetch")

        try {
            const { data, error } = await supabase
                .from("group_players")
                .select(`
                    groups(
                        group_name,
                        event_rounds(round_number, start_date, events(event_name))
                    )
                `)
                .eq("profile_id", playerId)

            if (error || !data) {
                endLog({ error: error?.message })
                reset()
                return
            }

            // Une inscription orpheline (tableau ou série supprimé) est écartée
            // plutôt que de faire planter l'affichage.
            const rows: PlayerHistoryRow[] = (data as unknown as RawRow[])
                .filter(r => r.groups?.event_rounds)
                .map(r => ({
                    group_name: r.groups!.group_name,
                    round_number: r.groups!.event_rounds!.round_number,
                    start_date: r.groups!.event_rounds!.start_date,
                    event_name: r.groups!.event_rounds!.events?.event_name ?? "",
                }))

            setHistory(buildPlayerHistory(rows))
            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            reset()
        } finally {
            setLoading(false)
        }
    }, [])

    return { history, loading, fetchHistory, reset }
}

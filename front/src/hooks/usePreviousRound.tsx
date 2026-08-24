import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { logger } from "@/lib/logger"
import { sortGroupsByName } from "@/lib/utils"
import { transformGroups, type Group } from "@/types/draw"
import type { EventRound } from "@/types/event"
import type { Match } from "@/types/match"

/**
 * Charge la série qui précède immédiatement une série donnée, dans le même événement.
 *
 * Remplace `usePreviousEvent`, qui remontait vers le dernier *événement* du club — un
 * reste du modèle d'avant l'introduction des séries. Depuis, un événement contient
 * plusieurs séries et « le tableau précédent » de la Série 3 est la Série 2 du même
 * événement, pas un autre événement.
 */
export function usePreviousRound() {
    const [previousRound, setPreviousRound] = useState<EventRound | null>(null)
    const [previousGroups, setPreviousGroups] = useState<Group[]>([])
    const [previousMatches, setPreviousMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(false)

    const reset = () => {
        setPreviousRound(null)
        setPreviousGroups([])
        setPreviousMatches([])
    }

    /**
     * @param eventId - événement courant
     * @param currentRoundNumber - numéro de la série en cours de configuration
     */
    const fetchPreviousRound = useCallback(async (eventId: string | null, currentRoundNumber: number) => {
        if (!eventId) {
            reset()
            return
        }

        setLoading(true)
        const endLog = logger.start("usePreviousRound.fetch")

        try {
            const { data: roundsData } = await supabase
                .from("event_rounds")
                .select("*")
                .eq("event_id", eventId)
                .order("round_number")

            // La série précédente est celle qui porte le plus grand numéro strictement
            // inférieur au numéro courant — pas forcément N-1 si une série a été supprimée.
            const previous = (roundsData ?? [])
                .filter((r: EventRound) => r.round_number < currentRoundNumber)
                .sort((a: EventRound, b: EventRound) => b.round_number - a.round_number)[0] ?? null

            if (!previous) {
                reset()
                return
            }

            setPreviousRound(previous as EventRound)

            const { data: groupsData } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("round_id", previous.id)
                .order("group_name")

            const groups = groupsData ? sortGroupsByName(transformGroups(groupsData)) : []
            setPreviousGroups(groups)

            if (groups.length === 0) {
                setPreviousMatches([])
                return
            }

            const { data: matchesData } = await supabase
                .from("matches")
                .select(`
                    *,
                    player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
                    player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
                    group:groups(id, group_name, round_id)
                `)
                .in("group_id", groups.map(g => g.id))
                .order("match_date")
                .order("match_time")

            setPreviousMatches(matchesData ?? [])
            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            reset()
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        previousRound,
        previousGroups,
        previousMatches,
        loading,
        fetchPreviousRound,
    }
}

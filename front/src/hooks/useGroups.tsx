import { supabase } from "@/lib/supabaseClient"
import { transformGroups, type Group, type SupabaseGroup } from "@/types/draw"
import { useCallback, useState } from "react"
import { handleHookError, withTimeout } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"
import { sortGroupsByName } from "@/lib/utils"

export function useGroups() {

    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Récupère les groupes d'un round avec leurs joueurs.
     * Charge via jointure group_players > profiles et transforme en Group[].
     * Si roundId est null, réinitialise la liste.
     */
    const fetchGroupsByRound = useCallback(async (roundId: string | null) => {

        if(!roundId) {
            setGroups([])
            return
        }

        setLoading(true)
        setError(null)
        const endLog = logger.start("useGroups.fetch")

        try {
            const { data, error: fetchError } = await withTimeout(
                supabase
                    .from("groups")
                    .select(`
                        *,
                        group_players(
                            profile_id,
                            profiles(
                                id,
                                first_name,
                                last_name,
                                phone,
                                power_ranking
                            )
                        )
                    `)
                    .eq("round_id", roundId)
                    .order("group_name", {ascending: true}),
                "useGroups.fetch"
            )

            if(fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useGroups.fetch")
                return
            }

            setGroups(sortGroupsByName(transformGroups(data as SupabaseGroup[] || [])))
            endLog()

        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }
    }, [])

    /**
     * Crée N groupes vides nommés "Box 1", "Box 2", etc.
     * Rafraîchit la liste après insertion.
     */
    const createGroups = async (roundId: string, numberOfGroups: number, maxPlayersPerGroup: number) => {

        setLoading(true)
        setError(null)

        try {
            const groupsToCreate = Array.from({ length: numberOfGroups }, (_, i) => ({
                round_id: roundId,
                group_name: `Box ${i + 1}`,
                max_players: maxPlayersPerGroup
            }))

            const { error: insertError } = await supabase
                .from("groups")
                .insert(groupsToCreate)

            if(insertError){
                handleHookError(insertError, setError, "useGroups.create")
                return
            }

            await fetchGroupsByRound(roundId)

        } catch (err) {
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }

    }

    /** Supprime un groupe et rafraîchit la liste. */
    const deleteGroup = async(groupId: string, roundId: string) => {

        setLoading(true)
        setError(null)

        try {
            const { error: deleteError } = await supabase
                .from("groups")
                .delete()
                .eq("id", groupId)

            if (deleteError) {
                handleHookError(deleteError, setError, "useGroups.delete")
                return
            }

            await fetchGroupsByRound(roundId)

        } catch (err) {
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }
    }

    /**
     * Assigne une liste de joueurs à un groupe via group_players.
     * Rafraîchit la liste après insertion.
     */
    const assignPlayersToGroup = async (groupId: string, playerIds: string[], roundId: string) => {

        setLoading(true)
        setError(null)

        try {
            const assignments = playerIds.map(playerId => ({
                group_id: groupId,
                profile_id: playerId
            }))

            const { error: insertError } = await supabase
                .from("group_players")
                .insert(assignments)

            if (insertError) {
                handleHookError(insertError, setError, "useGroups.assign")
                return
            }

            await fetchGroupsByRound(roundId)

        } catch (err) {
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }
    }

    /** Retire un joueur d'un groupe et rafraîchit la liste. */
    const removePlayerFromGroup = async(groupId: string, playerId: string, roundId: string) => {

        setLoading(true)
        setError(null)

        try {
            const { error: deleteError } = await supabase
                .from("group_players")
                .delete()
                .eq("group_id", groupId)
                .eq("profile_id", playerId)

            if (deleteError) {
                handleHookError(deleteError, setError, "useGroups.removePlayer")
                return
            }

            await fetchGroupsByRound(roundId)

        } catch (err) {
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }
    }

    return {
        groups,
        loading,
        error,
        fetchGroupsByRound,
        createGroups,
        deleteGroup,
        assignPlayersToGroup,
        removePlayerFromGroup
    }
}

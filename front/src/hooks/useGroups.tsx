import { supabase } from "@/lib/supabaseClient"
import type { Group, SupabaseGroup, SupabaseGroupPlayer } from "@/types/draw"
import { useCallback, useState } from "react"
import { handleHookError, withTimeout } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"

export function useGroups() {

    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    // fetch les groupes
    const fetchGroupsByEvent = useCallback(async (eventId: string | null) => {
        
        if(!eventId) {
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
                    .eq("event_id", eventId)
                    .order("group_name", {ascending: true}),
                "useGroups.fetch"
            )

            if(fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useGroups.fetch")
                return
            }

            // transformation des data
            const transformedGroups = (data as SupabaseGroup[] || []).map(group => ({
                id: group.id,
                event_id: group.event_id,
                group_name: group.group_name,
                max_players: group.max_players,
                created_at: group.created_at,
                players: group.group_players
                    ?.filter((gp: SupabaseGroupPlayer) => gp.profiles != null)
                    .map((gp: SupabaseGroupPlayer) => ({
                        id: gp.profiles.id,
                        first_name: gp.profiles.first_name,
                        last_name: gp.profiles.last_name,
                        phone: gp.profiles.phone,
                        power_ranking: gp.profiles.power_ranking ?? 0
                    })) || []
            }))

            setGroups(transformedGroups)
            endLog()

        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }
    }, [])

    // creation des groupes vides
    const createGroups = async (eventId: string, numberOfGroups: number, maxPlayersPerGroup: number) => {

        setLoading(true)
        setError(null)

        try {
            // creation des groupes
            const groupsToCreate = Array.from({ length: numberOfGroups }, (_, i) => ({
                event_id: eventId,
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

            // rafraichir la liste
            await fetchGroupsByEvent(eventId)

        } catch (err) {
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }

    }

    // supprimer le groupe
    const deleteGroup = async(groupId: string, eventId: string) => {

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

            // Rafraîchir la liste
            await fetchGroupsByEvent(eventId)

        } catch (err) {
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }
    }

    // assigner des joueurs à un groupe
    const assignPlayersToGroup = async (groupId: string, playerIds: string[], eventId: string) => {
    
        setLoading(true)
        setError(null)

        try {
            // Préparer les assignations
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

            // Rafraîchir la liste
            await fetchGroupsByEvent(eventId)

        } catch (err) {
            handleHookError(err, setError, "useGroups")
        } finally {
            setLoading(false)
        }
    }

    // retirer un joueur d'un groupe
    const removePlayerFromGroup = async(groupId: string, playerId: string, eventId: string) => {

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

            // Rafraîchir la liste
            await fetchGroupsByEvent(eventId)

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
        fetchGroupsByEvent,
        createGroups,
        deleteGroup,
        assignPlayersToGroup,
        removePlayerFromGroup
    }
}
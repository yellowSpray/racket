import { supabase } from "@/lib/supabaseClient"
import { useState } from "react"

export type GroupPlayer = {
    id: string
    first_name: string
    last_name: string
    phone: string
    power_ranking: string
}


export type Group = {
    id: string
    event_id: string
    group_name: string
    max_players: number
    created_at: string
    players?: GroupPlayer[]
}

type SupabaseProfile = {
    id: string
    first_name: string
    last_name: string
    phone: string
    power_ranking: string
}

type SupabaseGroupPlayer = {
    profiles_id: string
    profiles: SupabaseProfile
}

type SupabaseGroup = {
    id: string
    event_id: string
    group_name: string
    max_players: number
    created_at: string
    group_players?: SupabaseGroupPlayer[]
}

export function useGroups() {

    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    // fetch les groupes
    const fetchGroupsByEvents = async (eventId: string | null) => {
        
        if(!eventId) {
            setGroups([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data, error: fetchError } = await supabase
                .from("groups")
                .select(`
                    *,
                    group_players(
                        profiles_id,
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
                .order("group_name", {ascending: true})

            if(fetchError) {
                console.error("Erreur fetch groups:", fetchError)
                setError(fetchError.message)
                return
            }

            // transformation des data
            const transformedGroups = (data as SupabaseGroup[] || []).map(group => ({
                id: group.id,
                event_id: group.event_id,
                group_name: group.group_name,
                max_players: group.max_players,
                created_at: group.created_at,
                players: group.group_players?.map((gp: SupabaseGroupPlayer) => ({
                    id: gp.profiles.id,
                    first_name: gp.profiles.first_name,
                    last_name: gp.profiles.last_name,
                    phone: gp.profiles.phone,
                    power_ranking: gp.profiles.power_ranking || "0"
                })) || []
            }))

            setGroups(transformedGroups)

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }

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
                console.error("Erreur création groups:", insertError)
                setError(insertError.message)
                return
            }

            // rafraichir la liste
            await fetchGroupsByEvents(eventId)

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
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
                console.error("Erreur suppression group:", deleteError)
                setError(deleteError.message)
                return
            }

            // Rafraîchir la liste
            await fetchGroupsByEvents(eventId)

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
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
                console.error("Erreur assignation players:", insertError)
                setError(insertError.message)
                return
            }

            // Rafraîchir la liste
            await fetchGroupsByEvents(eventId)

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
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
                console.error("Erreur retrait player:", deleteError)
                setError(deleteError.message)
                return
            }

            // Rafraîchir la liste
            await fetchGroupsByEvents(eventId)

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }

    return {
        groups,
        loading,
        error,
        fetchGroupsByEvents,
        createGroups,
        deleteGroup,
        assignPlayersToGroup,
        removePlayerFromGroup
    }
}
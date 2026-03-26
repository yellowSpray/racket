import { supabase } from "@/lib/supabaseClient"
import { useCallback, useState } from "react"
import type { ClubMember } from "@/types/member"

export function useClubMembers() {
    const [members, setMembers] = useState<ClubMember[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Récupère tous les membres d'un club triés par date de création.
     * Charge les infos de profil, le rôle et le statut de liaison du compte.
     */
    const fetchMembers = useCallback(async (clubId: string) => {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, role, is_linked, created_at')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false })

        if (fetchError) {
            setError(fetchError.message)
            setMembers([])
        } else {
            setMembers((data as ClubMember[]) ?? [])
        }

        setLoading(false)
    }, [])

    /**
     * Invite un nouveau membre via une Edge Function Supabase.
     * Envoie un email d'invitation avec les infos de base du joueur.
     */
    const inviteMember = useCallback(async (email: string, firstName?: string, lastName?: string) => {
        // appel de l'Edge Function invite-member
        const { data, error: invokeError } = await supabase.functions.invoke('invite-member', {
            body: { email, first_name: firstName, last_name: lastName },
        })

        if (invokeError) {
            throw new Error(invokeError.message)
        }

        // vérifier le retour de la fonction
        if (data && !data.success) {
            throw new Error(data.error)
        }
    }, [])

    /**
     * Change le rôle d'un membre (user, admin, superadmin)
     * via la fonction RPC update_member_role.
     */
    const updateRole = useCallback(async (profileId: string, newRole: 'user' | 'admin' | 'superadmin') => {
        const { error: rpcError } = await supabase.rpc('update_member_role', {
            p_profile_id: profileId,
            p_new_role: newRole,
        })

        if (rpcError) {
            throw new Error(rpcError.message)
        }
    }, [])

    /**
     * Retire un membre du club via la fonction RPC remove_club_member.
     * Dissocie le profil du club sans supprimer le compte.
     */
    const removeMember = useCallback(async (profileId: string) => {
        const { error: rpcError } = await supabase.rpc('remove_club_member', {
            p_profile_id: profileId,
        })

        if (rpcError) {
            throw new Error(rpcError.message)
        }
    }, [])

    return {
        members,
        loading,
        error,
        fetchMembers,
        inviteMember,
        updateRole,
        removeMember,
    }
}

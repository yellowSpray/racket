import { supabase } from "@/lib/supabaseClient"
import { useCallback, useState } from "react"
import type { ClubMember } from "@/types/member"

export function useClubMembers() {
    const [members, setMembers] = useState<ClubMember[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

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

    const inviteMember = useCallback(async (email: string, firstName?: string, lastName?: string) => {
        const { data, error: invokeError } = await supabase.functions.invoke('invite-member', {
            body: { email, first_name: firstName, last_name: lastName },
        })

        if (invokeError) {
            throw new Error(invokeError.message)
        }

        if (data && !data.success) {
            throw new Error(data.error)
        }
    }, [])

    const updateRole = useCallback(async (profileId: string, newRole: 'user' | 'admin' | 'superadmin') => {
        const { error: rpcError } = await supabase.rpc('update_member_role', {
            p_profile_id: profileId,
            p_new_role: newRole,
        })

        if (rpcError) {
            throw new Error(rpcError.message)
        }
    }, [])

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

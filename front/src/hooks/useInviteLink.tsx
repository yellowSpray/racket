import { supabase } from "@/lib/supabaseClient"
import { useCallback, useState } from "react"
import { handleHookError } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"
import type { InviteEventInfo } from "@/types/visitor"

export function useInviteLink() {
    const [eventInfo, setEventInfo] = useState<InviteEventInfo | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Récupère les infos d'un événement à partir d'un token d'invitation.
     * Appelle la fonction RPC get_event_by_invite_token côté Supabase.
     */
    const fetchEventByToken = useCallback(async (token: string) => {
        setLoading(true)
        setError(null)
        setEventInfo(null)

        try {
            // appel RPC pour résoudre le token en infos événement
            const { data, error: rpcError } = await supabase.rpc(
                "get_event_by_invite_token",
                { p_token: token }
            )

            if (rpcError) {
                handleHookError(rpcError, setError, "fetchEventByToken")
                return
            }

            // vérifier le retour de la fonction SQL
            if (!data.success) {
                setError(data.error ?? "Erreur inconnue")
                logger.error("fetchEventByToken", data.error)
                return
            }

            setEventInfo(data.event)
        } catch (err) {
            handleHookError(err, setError, "fetchEventByToken")
        } finally {
            setLoading(false)
        }
    }, [])

    /** Construit l'URL d'invitation publique à partir du token. */
    const getInviteUrl = useCallback((inviteToken: string): string => {
        return `${window.location.origin}/events/join/${inviteToken}`
    }, [])

    return { eventInfo, loading, error, fetchEventByToken, getInviteUrl }
}

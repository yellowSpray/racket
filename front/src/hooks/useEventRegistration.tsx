import { supabase } from "@/lib/supabaseClient"
import { useCallback, useEffect, useState } from "react"

export function useEventRegistration(eventId: string | undefined, profileId: string | undefined) {
    const [isRegistered, setIsRegistered] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const checkRegistration = useCallback(async () => {
        if (!eventId || !profileId) return
        const { data } = await supabase
            .from("event_players")
            .select("id")
            .eq("event_id", eventId)
            .eq("profile_id", profileId)
            .maybeSingle()
        setIsRegistered(!!data)
    }, [eventId, profileId])

    useEffect(() => {
        checkRegistration()
    }, [checkRegistration])

    const register = useCallback(async () => {
        if (!eventId || !profileId) return
        setLoading(true)
        await supabase.from("event_players").insert({ event_id: eventId, profile_id: profileId })
        await checkRegistration()
        setLoading(false)
    }, [eventId, profileId, checkRegistration])

    const unregister = useCallback(async () => {
        if (!eventId || !profileId) return
        setLoading(true)
        await supabase.from("event_players").delete().eq("event_id", eventId).eq("profile_id", profileId)
        await checkRegistration()
        setLoading(false)
    }, [eventId, profileId, checkRegistration])

    return { isRegistered, loading, register, unregister }
}

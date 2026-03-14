import { supabase } from "@/lib/supabaseClient"
import { useCallback, useState } from "react"
import { handleHookError } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"
import type { VisitorRequest } from "@/types/visitor"

export function useVisitorRequests() {
    const [requests, setRequests] = useState<VisitorRequest[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchMyRequests = useCallback(async () => {
        setLoading(true)
        setError(null)
        const endLog = logger.start("useVisitorRequests.fetchMyRequests")

        const { data, error: fetchError } = await supabase
            .from("visitor_requests")
            .select("*, event:events(event_name, start_date, end_date, clubs(club_name, visitor_fee))")
            .order("created_at", { ascending: false })

        if (fetchError) {
            handleHookError(fetchError, setError, "useVisitorRequests.fetchMyRequests")
            setRequests([])
            endLog({ error: fetchError.message })
        } else {
            setRequests((data as VisitorRequest[]) ?? [])
            endLog()
        }

        setLoading(false)
    }, [])

    const fetchPendingForEvent = useCallback(async (eventId: string) => {
        setLoading(true)
        setError(null)
        const endLog = logger.start("useVisitorRequests.fetchPendingForEvent")

        const { data, error: fetchError } = await supabase
            .from("visitor_requests")
            .select("*, profile:profiles(first_name, last_name, email, clubs(club_name))")
            .eq("event_id", eventId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })

        if (fetchError) {
            handleHookError(fetchError, setError, "useVisitorRequests.fetchPendingForEvent")
            setRequests([])
            endLog({ error: fetchError.message })
        } else {
            setRequests((data as VisitorRequest[]) ?? [])
            endLog()
        }

        setLoading(false)
    }, [])

    const createRequest = useCallback(async (eventId: string, message?: string): Promise<{ success: boolean; error?: string }> => {
        const endLog = logger.start("useVisitorRequests.createRequest")

        const { data, error: rpcError } = await supabase.rpc("request_visitor_registration", {
            p_event_id: eventId,
            p_message: message,
        })

        if (rpcError) {
            endLog({ error: rpcError.message })
            return { success: false, error: rpcError.message }
        }

        if (data && !data.success) {
            endLog({ error: data.message })
            return { success: false, error: data.message }
        }

        endLog()
        return { success: true }
    }, [])

    const cancelRequest = useCallback(async (requestId: string) => {
        setError(null)
        const endLog = logger.start("useVisitorRequests.cancelRequest")

        const { error: updateError } = await supabase
            .from("visitor_requests")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", requestId)

        if (updateError) {
            handleHookError(updateError, setError, "useVisitorRequests.cancelRequest")
            endLog({ error: updateError.message })
        } else {
            endLog()
        }
    }, [])

    const reviewRequest = useCallback(async (requestId: string, decision: string): Promise<{ success: boolean; error?: string }> => {
        const endLog = logger.start("useVisitorRequests.reviewRequest")

        const { data, error: rpcError } = await supabase.rpc("review_visitor_request", {
            p_request_id: requestId,
            p_decision: decision,
        })

        if (rpcError) {
            endLog({ error: rpcError.message })
            return { success: false, error: rpcError.message }
        }

        if (data && !data.success) {
            endLog({ error: data.message })
            return { success: false, error: data.message }
        }

        endLog()
        return { success: true }
    }, [])

    return { requests, loading, error, fetchMyRequests, fetchPendingForEvent, createRequest, cancelRequest, reviewRequest }
}

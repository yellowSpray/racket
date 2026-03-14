import { supabase } from "@/lib/supabaseClient"
import { useCallback, useState } from "react"
import { handleHookError } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"
import type { DiscoverableEvent } from "@/types/visitor"

interface RawDiscoverableEvent {
    id: string
    event_name: string
    description?: string
    start_date: string
    end_date: string
    open_to_visitors: boolean
    invite_token: string
    club_id: string
    clubs: { club_name: string; visitor_fee: number }
    event_players: { count: number }[]
}

export function useDiscoverEvents() {
    const [events, setEvents] = useState<DiscoverableEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchDiscoverableEvents = useCallback(async (userClubId: string) => {
        setLoading(true)
        setError(null)

        try {
            const end = logger.start("useDiscoverEvents.fetch")

            const [eventsResult, requestsResult] = await Promise.all([
                supabase
                    .from("events")
                    .select("*, clubs(club_name, visitor_fee), event_players(count)")
                    .neq("club_id", userClubId)
                    .order("start_date", { ascending: false }),
                supabase
                    .from("visitor_requests")
                    .select("event_id, status"),
            ])

            if (eventsResult.error) {
                end({ error: eventsResult.error.message })
                setError(eventsResult.error.message)
                setEvents([])
                setLoading(false)
                return
            }

            const rawEvents = (eventsResult.data as RawDiscoverableEvent[] | null) ?? []
            const requests = (requestsResult.data as { event_id: string; status: string }[] | null) ?? []

            const requestMap = new Map(requests.map((r) => [r.event_id, r.status]))

            const merged: DiscoverableEvent[] = rawEvents.map((evt) => ({
                id: evt.id,
                event_name: evt.event_name,
                description: evt.description,
                start_date: evt.start_date,
                end_date: evt.end_date,
                open_to_visitors: evt.open_to_visitors,
                invite_token: evt.invite_token,
                club_id: evt.club_id,
                clubs: evt.clubs,
                player_count: evt.event_players?.[0]?.count ?? 0,
                my_request_status: (requestMap.get(evt.id) as DiscoverableEvent["my_request_status"]) ?? null,
            }))

            setEvents(merged)
            end()
        } catch (err) {
            handleHookError(err, setError, "useDiscoverEvents")
            setEvents([])
        } finally {
            setLoading(false)
        }
    }, [])

    return { events, loading, error, fetchDiscoverableEvents }
}

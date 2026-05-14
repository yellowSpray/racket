import { supabase } from "@/lib/supabaseClient";
import type { Event, EventContextType, EventRound } from "@/types/event";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { logger } from "@/lib/logger";
import { withTimeout } from "@/lib/handleHookError";
import { useAuth } from "@/contexts/AuthContext";

const EventContext = createContext<EventContextType | undefined>(undefined)

/** Renvoie le round actif ou le plus récent d'une série. */
function resolveCurrentRound(rounds: EventRound[]): EventRound | null {
    if (!rounds || rounds.length === 0) return null
    return (
        rounds.find(r => r.status === 'active') ??
        [...rounds].sort((a, b) => b.round_number - a.round_number)[0]
    )
}

// Provider
export function EventProvider({children}: {children: ReactNode}) {

    const { profile } = useAuth()
    const [currentEvent, setCurrentEventState] = useState<Event | null>(null)
    const [currentRound, setCurrentRound] = useState<EventRound | null>(null)
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const fetchEvents = async () => {
        setLoading(true)
        setError(null)
        const endLog = logger.start("EventContext.fetchEvents")

        try {
            await supabase.rpc("update_event_statuses")

            const {data, error: fetchError} = await withTimeout(
                supabase
                    .from("events")
                    .select("*, event_players(count), event_rounds(*)")
                    .order("created_at", {ascending: false}),
                "EventContext.fetchEvents"
            )

            if(fetchError) {
                endLog({ error: fetchError.message })
                setError(fetchError.message)
                return
            }

            const userClubId = profile?.club_id
            const filteredData = userClubId
                ? (data || []).filter(event => event.club_id === userClubId)
                : (data || [])

            const eventsWithCount: Event[] = filteredData.map(event => ({
                ...event,
                player_count: Array.isArray(event.event_players) && event.event_players.length > 0
                    ? event.event_players[0].count
                    : 0,
                event_rounds: (event.event_rounds || []).sort(
                    (a: EventRound, b: EventRound) => a.round_number - b.round_number
                ),
            }))

            setEvents(eventsWithCount)
            logger.info("EventContext", `${eventsWithCount.length} série(s) chargée(s)`)

            if (eventsWithCount.length > 0) {
                const savedEventId = localStorage.getItem("selectedEventId")
                const savedEvent = savedEventId
                    ? eventsWithCount.find(e => e.id === savedEventId)
                    : null

                let selectedEvent: Event
                if (savedEvent) {
                    selectedEvent = savedEvent
                } else {
                    // Prioriser la série qui a un round actif, sinon la plus récente
                    selectedEvent =
                        eventsWithCount.find(e =>
                            (e.event_rounds || []).some(r => r.status === 'active')
                        ) ?? eventsWithCount[0]
                    localStorage.setItem("selectedEventId", selectedEvent.id)
                }

                setCurrentEventState(selectedEvent)
                setCurrentRound(resolveCurrentRound(selectedEvent.event_rounds || []))
            }

            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }

    const selectEvent = (eventId: string | null) => {
        if(!eventId) {
            setCurrentEventState(null)
            setCurrentRound(null)
            localStorage.removeItem("selectedEventId")
            return
        }

        const event = events.find(e => e.id === eventId)
        if(event) {
            setCurrentEventState(event)
            setCurrentRound(resolveCurrentRound(event.event_rounds || []))
            localStorage.setItem("selectedEventId", eventId)
        }
    }

    useEffect(() => {
        if (profile) fetchEvents()
    }, [profile?.id])

    const value: EventContextType = {
        currentEvent,
        currentRound,
        events,
        loading,
        error,
        setCurrentEvent: selectEvent,
        fetchEvents
    }

    return (
        <EventContext.Provider value={value}>
            {children}
        </EventContext.Provider>
    )
}

// Hook
/* eslint-disable react-refresh/only-export-components */
export function useEvent() {
    const context = useContext(EventContext)
    if(!context) {
        throw new Error("useEvent doit être utilisé dans EventProvider")
    }
    return context
}

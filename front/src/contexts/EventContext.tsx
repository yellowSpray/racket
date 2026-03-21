import { supabase } from "@/lib/supabaseClient";
import type { Event, EventContextType } from "@/types/event";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { logger } from "@/lib/logger";
import { withTimeout } from "@/lib/handleHookError";
import { useAuth } from "@/contexts/AuthContext";

const EventContext = createContext<EventContextType | undefined>(undefined)

// Provider
export function EventProvider({children}: {children: ReactNode}) {

    const { profile } = useAuth()
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    // fetch des events
    const fetchEvents = async () => {
        setLoading(true)
        setError(null)
        const endLog = logger.start("EventContext.fetchEvents")

        try {
            const {data, error: fetchError} = await withTimeout(
                supabase
                    .from("events")
                    .select("*, event_players(count)")
                    .order("start_date", {ascending: false}),
                "EventContext.fetchEvents"
            )

            if(fetchError) {
                endLog({ error: fetchError.message })
                setError(fetchError.message)
                return
            }

            // Filtrer pour ne garder que les events du club de l'utilisateur
            // (la RLS retourne aussi les events ouverts d'autres clubs)
            const userClubId = profile?.club_id
            const filteredData = userClubId
                ? (data || []).filter(event => event.club_id === userClubId)
                : (data || [])

            const eventsWithCount = filteredData.map(event => ({
                ...event,
                player_count: Array.isArray(event.event_players) && event.event_players.length >  0
                    ? event.event_players[0].count
                    : 0
            }))

            setEvents(eventsWithCount)
            logger.info("EventContext", `${eventsWithCount.length} événement(s) chargé(s)`)
            eventsWithCount.forEach(e => logger.info("EventContext", `  → "${e.event_name}" status=${e.status ?? "undefined"}`))

            // Restaurer l'event sauvegardé ou sélectionner le plus récent
            if (eventsWithCount.length > 0) {
                const savedEventId = localStorage.getItem("selectedEventId")
                const savedEvent = savedEventId ? eventsWithCount.find(e => e.id === savedEventId) : null

                if (savedEvent) {
                    setCurrentEvent(savedEvent)
                } else {
                    // Pas de sauvegarde valide → sélectionner le plus récent
                    const mostRecentEvent = eventsWithCount[0]
                    setCurrentEvent(mostRecentEvent)
                    localStorage.setItem("selectedEventId", mostRecentEvent.id)
                }
            }

            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }

    // selection d'un event
    const selectEvent = (eventId: string | null) => {
        if(!eventId) {
            setCurrentEvent(null)
            localStorage.removeItem("selectedEventId")
            return
        }

        const event = events.find(e => e.id === eventId)
        if(event) {
            setCurrentEvent(event)
            localStorage.setItem("selectedEventId", eventId)
        }
    }

    // charger les events au montage
    useEffect(() => {
        fetchEvents()
    }, [])

    const value: EventContextType = {
        currentEvent,
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
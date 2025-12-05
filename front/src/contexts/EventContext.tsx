import { supabase } from "@/lib/supabaseClient";
import type { Event, EventContextType } from "@/types/event";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const EventContext = createContext<EventContextType | undefined>(undefined)

// Provider
export function EventProvider({children}: {children: ReactNode}) {
    
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    // fetch des events
    const fetchEvents = async () => {
        setLoading(true)
        setError(null)

        try {
            const {data, error: fetchError} = await supabase
                .from("events")
                .select("*, event_players(count)")
                .order("start_date", {ascending: false})

            if(fetchError) {
                console.error("Erreur fetch events:", fetchError.message)
                setError(fetchError.message)
                return
            }

            const eventsWithCount = (data || []).map(event => ({
                ...event,
                player_count: Array.isArray(event.event_players) && event.event_players.length >  0
                    ? event.event_players[0].count
                    : 0
            }))

            setEvents(eventsWithCount)

            // si aucun events est selectionné , selectionner le plus récent
            if(!currentEvent && eventsWithCount && eventsWithCount.length > 0) {
                const mostRecentEvent = eventsWithCount[0]
                setCurrentEvent(mostRecentEvent)
                // sauvegarde dans le localStorage
                localStorage.setItem("selectedEventId", mostRecentEvent.id)
            }

        } catch (err) {
            console.error("Erreur inattendue:", err)
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

    // charger les events 
    useEffect(() => {
        const initEvents = async () => {
            await fetchEvents()

            // recuperer l'event du localStorage
            const savedEventId = localStorage.getItem("selectedEventId")
            if(savedEventId) {
                const savedEvent = events.find(e => e.id === savedEventId)
                if(savedEvent) {
                    setCurrentEvent(savedEvent)
                }
            }
        }

        initEvents()

        //TODO
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
import { supabase } from "@/lib/supabaseClient"
import type { EventCourt } from "@/types/settings"
import { useCallback, useState } from "react"

export function useEventCourts() {

    const [courts, setCourts] = useState<EventCourt[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const fetchCourts = useCallback(async (eventId: string | null) => {
        if (!eventId) {
            setCourts([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data, error: fetchError } = await supabase
                .from("event_courts")
                .select("*")
                .eq("event_id", eventId)
                .order("sort_order", { ascending: true })

            if (fetchError) {
                setError(fetchError.message)
                return
            }

            setCourts(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }, [])

    const addCourt = async (eventId: string, data: { court_name: string; available_from: string; available_to: string }) => {
        setError(null)

        const sortOrder = courts.length

        const { data: result, error: insertError } = await supabase
            .from("event_courts")
            .insert({
                event_id: eventId,
                court_name: data.court_name,
                available_from: data.available_from,
                available_to: data.available_to,
                sort_order: sortOrder,
            })
            .select()
            .single()

        if (insertError) {
            setError(insertError.message)
            return false
        }

        setCourts(prev => [...prev, result])
        return true
    }

    const updateCourt = async (courtId: string, data: { court_name?: string; available_from?: string; available_to?: string }) => {
        setError(null)

        const { data: result, error: updateError } = await supabase
            .from("event_courts")
            .update(data)
            .eq("id", courtId)
            .select()
            .single()

        if (updateError) {
            setError(updateError.message)
            return false
        }

        setCourts(prev => prev.map(c => c.id === courtId ? result : c))
        return true
    }

    const removeCourt = async (courtId: string) => {
        setError(null)

        const { error: deleteError } = await supabase
            .from("event_courts")
            .delete()
            .eq("id", courtId)

        if (deleteError) {
            setError(deleteError.message)
            return false
        }

        setCourts(prev => prev.filter(c => c.id !== courtId))
        return true
    }

    const initCourts = async (eventId: string, numberOfCourts: number, availableFrom: string, availableTo: string) => {
        setError(null)

        const courtsToCreate = Array.from({ length: numberOfCourts }, (_, i) => ({
            event_id: eventId,
            court_name: `Terrain ${i + 1}`,
            available_from: availableFrom,
            available_to: availableTo,
            sort_order: i,
        }))

        const { data, error: insertError } = await supabase
            .from("event_courts")
            .insert(courtsToCreate)
            .select()

        if (insertError) {
            setError(insertError.message)
            return false
        }

        setCourts(data || [])
        return true
    }

    return {
        courts,
        loading,
        error,
        fetchCourts,
        addCourt,
        updateCourt,
        removeCourt,
        initCourts,
    }
}

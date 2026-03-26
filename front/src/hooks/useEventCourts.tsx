import { supabase } from "@/lib/supabaseClient"
import type { EventCourt } from "@/types/settings"
import { useCallback, useState } from "react"
import { handleHookError } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"

export function useEventCourts() {

    const [courts, setCourts] = useState<EventCourt[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Charge les terrains d'un événement triés par ordre d'affichage.
     * Si eventId est null, réinitialise la liste.
     */
    const fetchCourts = useCallback(async (eventId: string | null) => {
        if (!eventId) {
            setCourts([])
            return
        }

        setLoading(true)
        setError(null)
        const endLog = logger.start("useEventCourts.fetch")

        try {
            const { data, error: fetchError } = await supabase
                .from("event_courts")
                .select("*")
                .eq("event_id", eventId)
                .order("sort_order", { ascending: true })

            if (fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useEventCourts.fetch")
                return
            }

            setCourts(data || [])
            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            handleHookError(err, setError, "useEventCourts")
        } finally {
            setLoading(false)
        }
    }, [])

    /**
     * Ajoute un terrain à l'événement.
     * Le sort_order est automatiquement placé en dernière position.
     */
    const addCourt = async (eventId: string, data: { court_name: string; available_from: string; available_to: string }) => {
        setError(null)

        // placer le nouveau terrain en fin de liste
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
            handleHookError(insertError, setError, "useEventCourts.add")
            return false
        }

        setCourts(prev => [...prev, result])
        return true
    }

    /** Met à jour le nom ou les horaires de disponibilité d'un terrain. */
    const updateCourt = async (courtId: string, data: { court_name?: string; available_from?: string; available_to?: string }) => {
        setError(null)

        const { data: result, error: updateError } = await supabase
            .from("event_courts")
            .update(data)
            .eq("id", courtId)
            .select()
            .single()

        if (updateError) {
            handleHookError(updateError, setError, "useEventCourts.update")
            return false
        }

        setCourts(prev => prev.map(c => c.id === courtId ? result : c))
        return true
    }

    /** Supprime un terrain et le retire du state local. */
    const removeCourt = async (courtId: string) => {
        setError(null)

        const { error: deleteError } = await supabase
            .from("event_courts")
            .delete()
            .eq("id", courtId)

        if (deleteError) {
            handleHookError(deleteError, setError, "useEventCourts.remove")
            return false
        }

        setCourts(prev => prev.filter(c => c.id !== courtId))
        return true
    }

    /**
     * Initialise les terrains d'un événement en batch.
     * Crée N terrains nommés "Terrain 1", "Terrain 2", etc.
     * avec les mêmes horaires de disponibilité.
     */
    const initCourts = async (eventId: string, numberOfCourts: number, availableFrom: string, availableTo: string) => {
        setError(null)

        // générer les terrains avec un nom et un ordre séquentiel
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
            handleHookError(insertError, setError, "useEventCourts.init")
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

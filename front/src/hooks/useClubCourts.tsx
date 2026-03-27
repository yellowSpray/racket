import { supabase } from "@/lib/supabaseClient"
import type { ClubCourt } from "@/types/settings"
import { useCallback, useState } from "react"
import { handleHookError } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"

export function useClubCourts() {

    const [courts, setCourts] = useState<ClubCourt[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const syncDefaultCount = async (clubId: string, count: number) => {
        await supabase
            .from("clubs")
            .update({ default_number_of_courts: count })
            .eq("id", clubId)
    }

    const fetchClubCourts = useCallback(async (clubId: string | null) => {
        if (!clubId) {
            setCourts([])
            return
        }

        setLoading(true)
        setError(null)
        const endLog = logger.start("useClubCourts.fetch")

        try {
            const { data, error: fetchError } = await supabase
                .from("club_courts")
                .select("*")
                .eq("club_id", clubId)
                .order("sort_order", { ascending: true })

            if (fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useClubCourts.fetch")
                return
            }

            const courtsList = data || []
            setCourts(courtsList)
            // Synchroniser default_number_of_courts avec le nombre reel de terrains
            if (courtsList.length > 0) {
                await syncDefaultCount(clubId, courtsList.length)
            }
            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            handleHookError(err, setError, "useClubCourts")
        } finally {
            setLoading(false)
        }
    }, [])


    const addClubCourt = async (clubId: string, data: { court_name: string; available_from: string; available_to: string }) => {
        setError(null)

        const sortOrder = courts.length

        const { data: result, error: insertError } = await supabase
            .from("club_courts")
            .insert({
                club_id: clubId,
                court_name: data.court_name,
                available_from: data.available_from,
                available_to: data.available_to,
                sort_order: sortOrder,
            })
            .select()
            .single()

        if (insertError) {
            handleHookError(insertError, setError, "useClubCourts.add")
            return false
        }

        const updated = [...courts, result]
        setCourts(updated)
        await syncDefaultCount(clubId, updated.length)
        return true
    }

    const updateClubCourt = async (courtId: string, data: { court_name?: string; available_from?: string; available_to?: string }) => {
        setError(null)

        const { data: result, error: updateError } = await supabase
            .from("club_courts")
            .update(data)
            .eq("id", courtId)
            .select()
            .single()

        if (updateError) {
            handleHookError(updateError, setError, "useClubCourts.update")
            return false
        }

        setCourts(prev => prev.map(c => c.id === courtId ? result : c))
        return true
    }

    const removeClubCourt = async (courtId: string) => {
        setError(null)

        const { error: deleteError } = await supabase
            .from("club_courts")
            .delete()
            .eq("id", courtId)

        if (deleteError) {
            handleHookError(deleteError, setError, "useClubCourts.remove")
            return false
        }

        const updated = courts.filter(c => c.id !== courtId)
        setCourts(updated)
        // Trouver le club_id depuis le terrain supprime
        const removed = courts.find(c => c.id === courtId)
        if (removed) await syncDefaultCount(removed.club_id, updated.length)
        return true
    }

    const initClubCourts = async (clubId: string, numberOfCourts: number, availableFrom: string, availableTo: string) => {
        setError(null)

        const courtsToCreate = Array.from({ length: numberOfCourts }, (_, i) => ({
            club_id: clubId,
            court_name: `Terrain ${i + 1}`,
            available_from: availableFrom,
            available_to: availableTo,
            sort_order: i,
        }))

        const { data, error: insertError } = await supabase
            .from("club_courts")
            .insert(courtsToCreate)
            .select()

        if (insertError) {
            handleHookError(insertError, setError, "useClubCourts.init")
            return false
        }

        setCourts(data || [])
        await syncDefaultCount(clubId, numberOfCourts)
        return true
    }

    return {
        courts,
        loading,
        error,
        fetchClubCourts,
        addClubCourt,
        updateClubCourt,
        removeClubCourt,
        initClubCourts,
    }
}

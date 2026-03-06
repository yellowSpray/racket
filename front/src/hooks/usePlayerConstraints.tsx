import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Group } from "@/types/draw"
import type { PlayerConstraints } from "@/lib/matchScheduler"

/**
 * Extrait "HH:MM" depuis un timestamp Supabase ou un time brut.
 */
function extractTime(value: string): string {
    const isoMatch = value.match(/T(\d{2}:\d{2})/)
    if (isoMatch) return isoMatch[1]
    const timeMatch = value.match(/^(\d{2}:\d{2})/)
    if (timeMatch) return timeMatch[1]
    return ""
}

/**
 * Hook pour charger les contraintes joueurs (arrivée, départ, absences)
 * depuis Supabase pour un événement donné.
 */
export function usePlayerConstraints() {
    const [constraints, setConstraints] = useState<Map<string, PlayerConstraints>>(new Map())

    const fetchConstraints = useCallback(async (eventId: string, groups: Group[]) => {
        const playerIds = new Set<string>()
        for (const group of groups) {
            for (const player of group.players || []) {
                playerIds.add(player.id)
            }
        }

        if (playerIds.size === 0) {
            setConstraints(new Map())
            return
        }

        const ids = Array.from(playerIds)
        const result = new Map<string, PlayerConstraints>()

        const [scheduleEventRes, scheduleGeneralRes, absencesEventRes, absencesGeneralRes] = await Promise.all([
            supabase.from("schedule").select("profile_id, arrival, departure").eq("event_id", eventId).in("profile_id", ids),
            supabase.from("schedule").select("profile_id, arrival, departure").is("event_id", null).in("profile_id", ids),
            supabase.from("absences").select("profile_id, absent_date").eq("event_id", eventId).in("profile_id", ids),
            supabase.from("absences").select("profile_id, absent_date").is("event_id", null).in("profile_id", ids),
        ])

        for (const id of ids) {
            result.set(id, { arrival: "", departure: "", unavailable: [] })
        }

        // Schedules généraux (fallback)
        if (scheduleGeneralRes.data) {
            for (const s of scheduleGeneralRes.data) {
                const c = result.get(s.profile_id)
                if (c && s.arrival) c.arrival = extractTime(s.arrival)
                if (c && s.departure) c.departure = extractTime(s.departure)
            }
        }

        // Schedules spécifiques (prioritaires)
        if (scheduleEventRes.data) {
            for (const s of scheduleEventRes.data) {
                const c = result.get(s.profile_id)
                if (c && s.arrival) c.arrival = extractTime(s.arrival)
                if (c && s.departure) c.departure = extractTime(s.departure)
            }
        }

        // Absences générales
        if (absencesGeneralRes.data) {
            for (const a of absencesGeneralRes.data) {
                const c = result.get(a.profile_id)
                if (c && !c.unavailable.includes(a.absent_date)) c.unavailable.push(a.absent_date)
            }
        }

        // Absences spécifiques
        if (absencesEventRes.data) {
            for (const a of absencesEventRes.data) {
                const c = result.get(a.profile_id)
                if (c && !c.unavailable.includes(a.absent_date)) c.unavailable.push(a.absent_date)
            }
        }

        setConstraints(result)
    }, [])

    return { constraints, fetchConstraints }
}

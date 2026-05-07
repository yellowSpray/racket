import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { withTimeout } from "@/lib/handleHookError"

export interface PlayerMovement {
    profileId: string
    firstName: string
    lastName: string
    status: "active" | "inactive"
    registeredAt: string
    eventName: string
    eventId: string
}

interface EventPlayerRow {
    profile_id: string
    registered_at: string
    profiles: { first_name: string; last_name: string }
}

/**
 * Compare les joueurs entre le dernier événement du club et l'avant-dernier.
 * Nouveaux inscrits → active (eventName = dernier événement)
 * Désinscrits → inactive (eventName = avant-dernier événement)
 */
export function usePlayerMovements(clubId: string | null) {
    const [movements, setMovements] = useState<PlayerMovement[]>([])
    const [loading, setLoading] = useState(false)

    const fetchMovements = useCallback(async () => {
        if (!clubId) {
            setMovements([])
            return
        }

        setLoading(true)

        try {
            // 1. Les deux derniers événements du club
            const { data: recentEvents, error: eventsError } = await withTimeout(
                supabase
                    .from("events")
                    .select("id, event_name, start_date")
                    .eq("club_id", clubId)
                    .order("start_date", { ascending: false })
                    .limit(2),
                "usePlayerMovements.recentEvents"
            )

            if (eventsError || !recentEvents || recentEvents.length === 0) {
                setMovements([])
                return
            }

            const latestEvent = recentEvents[0]
            const prevEvent = recentEvents[1] ?? null

            // 2. Joueurs du dernier événement
            const { data: latestPlayers, error: latestError } = await withTimeout(
                supabase
                    .from("event_players")
                    .select("profile_id, registered_at, profiles!inner(first_name, last_name)")
                    .eq("event_id", latestEvent.id),
                "usePlayerMovements.latestPlayers"
            )

            if (latestError || !latestPlayers) {
                setMovements([])
                return
            }

            const latest = latestPlayers as unknown as EventPlayerRow[]

            // Pas d'événement précédent → tous les inscrits sont nouveaux
            if (!prevEvent) {
                setMovements(
                    latest.map((row) => ({
                        profileId: row.profile_id,
                        firstName: row.profiles.first_name,
                        lastName: row.profiles.last_name,
                        status: "active" as const,
                        registeredAt: row.registered_at,
                        eventName: latestEvent.event_name,
                        eventId: latestEvent.id,
                    }))
                )
                return
            }

            // 3. Joueurs de l'avant-dernier événement
            const { data: prevPlayers, error: prevError } = await withTimeout(
                supabase
                    .from("event_players")
                    .select("profile_id, registered_at, profiles!inner(first_name, last_name)")
                    .eq("event_id", prevEvent.id),
                "usePlayerMovements.prevPlayers"
            )

            if (prevError) {
                setMovements([])
                return
            }

            const previous = (prevPlayers ?? []) as unknown as EventPlayerRow[]
            const prevIds = new Set(previous.map((p) => p.profile_id))
            const latestIds = new Set(latest.map((p) => p.profile_id))

            const results: PlayerMovement[] = []

            // Nouveaux inscrits : dans le dernier mais pas dans l'avant-dernier
            for (const row of latest) {
                if (!prevIds.has(row.profile_id)) {
                    results.push({
                        profileId: row.profile_id,
                        firstName: row.profiles.first_name,
                        lastName: row.profiles.last_name,
                        status: "active",
                        registeredAt: row.registered_at,
                        eventName: latestEvent.event_name,
                        eventId: latestEvent.id,
                    })
                }
            }

            // Désinscrits : dans l'avant-dernier mais pas dans le dernier
            for (const row of previous) {
                if (!latestIds.has(row.profile_id)) {
                    results.push({
                        profileId: row.profile_id,
                        firstName: row.profiles.first_name,
                        lastName: row.profiles.last_name,
                        status: "inactive",
                        registeredAt: row.registered_at,
                        eventName: prevEvent.event_name,
                        eventId: prevEvent.id,
                    })
                }
            }

            results.sort((a, b) => {
                if (a.status !== b.status) return a.status === "active" ? -1 : 1
                return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
            })

            setMovements(results)
        } catch {
            setMovements([])
        } finally {
            setLoading(false)
        }
    }, [clubId])

    useEffect(() => {
        fetchMovements()
    }, [fetchMovements])

    return { movements, loading }
}

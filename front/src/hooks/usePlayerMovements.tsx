import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { withTimeout } from "@/lib/handleHookError"

export interface PlayerMovement {
    profileId: string
    firstName: string
    lastName: string
    status: "active" | "inactive"
    updatedAt: string
}

// type brut retourné par Supabase pour les joueurs d'un événement
interface EventPlayerRow {
    profile_id: string
    registered_at: string
    profiles: { id: string; first_name: string; last_name: string }
}

/**
 * Compare les joueurs inscrits entre l'événement courant et le précédent
 * pour identifier les arrivées (active) et les départs (inactive).
 * Se recharge automatiquement quand eventId ou clubId change.
 */
export function usePlayerMovements(eventId: string | null, clubId: string | null) {
    const [movements, setMovements] = useState<PlayerMovement[]>([])
    const [loading, setLoading] = useState(false)

    /**
     * Récupère les mouvements de joueurs entre l'événement précédent et l'actuel.
     * Nouveaux inscrits → active, anciens partis → inactive.
     */
    const fetchMovements = useCallback(async () => {
        if (!eventId || !clubId) {
            setMovements([])
            return
        }

        setLoading(true)

        try {
            // 1. Fetch the current event's start_date to anchor the search
            const { data: currentEvent, error: currentEventError } = await withTimeout(
                supabase
                    .from("events")
                    .select("start_date")
                    .eq("id", eventId)
                    .single(),
                "usePlayerMovements.currentEvent"
            )

            if (currentEventError || !currentEvent) {
                setMovements([])
                return
            }

            // 2. Find the most recent event that started strictly before the current one
            // Using start_date prevents concurrent/overlapping events from being picked
            const { data: prevEvent, error: prevError } = await withTimeout(
                supabase
                    .from("events")
                    .select("id")
                    .eq("club_id", clubId)
                    .neq("id", eventId)
                    .lt("start_date", currentEvent.start_date)
                    .order("start_date", { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                "usePlayerMovements.prevEvent"
            )

            if (prevError) {
                setMovements([])
                return
            }

            // 2. Fetch current event players with profiles
            const { data: currentPlayers, error: currentError } = await withTimeout(
                supabase
                    .from("event_players")
                    .select("profile_id, registered_at, profiles!inner(id, first_name, last_name)")
                    .eq("event_id", eventId),
                "usePlayerMovements.currentPlayers"
            )

            if (currentError || !currentPlayers) {
                setMovements([])
                return
            }

            const current = currentPlayers as unknown as EventPlayerRow[]

            // No previous event → all current players are new inscriptions
            if (!prevEvent) {
                setMovements(
                    current.map((row) => ({
                        profileId: row.profile_id,
                        firstName: row.profiles.first_name,
                        lastName: row.profiles.last_name,
                        status: "active" as const,
                        updatedAt: row.registered_at,
                    }))
                )
                return
            }

            // 3. Fetch previous event players with profiles
            const { data: prevPlayers, error: prevPlayersError } = await withTimeout(
                supabase
                    .from("event_players")
                    .select("profile_id, registered_at, profiles!inner(id, first_name, last_name)")
                    .eq("event_id", prevEvent.id),
                "usePlayerMovements.prevPlayers"
            )

            if (prevPlayersError) {
                setMovements([])
                return
            }

            const previous = (prevPlayers ?? []) as unknown as EventPlayerRow[]
            const prevIds = new Set(previous.map((p) => p.profile_id))
            const currentIds = new Set(current.map((p) => p.profile_id))

            const results: PlayerMovement[] = []

            // New players (in current but not in previous) → "active" / Inscrit
            for (const row of current) {
                if (!prevIds.has(row.profile_id)) {
                    results.push({
                        profileId: row.profile_id,
                        firstName: row.profiles.first_name,
                        lastName: row.profiles.last_name,
                        status: "active",
                        updatedAt: row.registered_at,
                    })
                }
            }

            // Left players (in previous but not in current) → "inactive" / Désinscrit
            for (const row of previous) {
                if (!currentIds.has(row.profile_id)) {
                    results.push({
                        profileId: row.profile_id,
                        firstName: row.profiles.first_name,
                        lastName: row.profiles.last_name,
                        status: "inactive",
                        updatedAt: row.registered_at,
                    })
                }
            }

            // Sort: active first, then inactive, each group by name
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
    }, [eventId, clubId])

    useEffect(() => {
        fetchMovements()
    }, [fetchMovements])

    return { movements, loading }
}

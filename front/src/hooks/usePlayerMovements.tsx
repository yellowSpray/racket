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

interface EventPlayerRow {
    profile_id: string
    registered_at: string
    profiles: { id: string; first_name: string; last_name: string }
}

export function usePlayerMovements(eventId: string | null, clubId: string | null) {
    const [movements, setMovements] = useState<PlayerMovement[]>([])
    const [loading, setLoading] = useState(false)

    const fetchMovements = useCallback(async () => {
        if (!eventId || !clubId) {
            setMovements([])
            return
        }

        setLoading(true)

        try {
            // 1. Find previous event for this club
            const { data: prevEvent, error: prevError } = await withTimeout(
                supabase
                    .from("events")
                    .select("id")
                    .eq("club_id", clubId)
                    .neq("id", eventId)
                    .order("end_date", { ascending: false })
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
                    .select("profile_id, profiles!inner(id, first_name, last_name)")
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

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { withTimeout } from "@/lib/handleHookError"

export interface PlayerMovement {
    profileId: string
    firstName: string
    lastName: string
    status: "active" | "inactive"
    registeredAt: string
    /** Série du mouvement : la courante pour une arrivée, la précédente pour un départ. */
    roundId: string
    roundNumber: number
}

interface RoundPlayerRow {
    profile_id: string
    registered_at: string
    profiles: { first_name: string; last_name: string } | null
}

/**
 * Arrivées et départs entre une série et celle qui la précède.
 *
 * L'unité de comparaison est la **série**, pas l'événement. Un joueur s'inscrit
 * à une série, et un club fait tourner plusieurs événements en parallèle :
 * comparer deux événements mélangeait des populations sans rapport. La lecture
 * se limite donc aux inscriptions portant un `round_id`.
 *
 * @param roundId - série en cours
 * @param previousRoundId - série qui la précède, `null` pour la première
 */
export function usePlayerMovements(roundId: string | null, previousRoundId: string | null) {
    const [movements, setMovements] = useState<PlayerMovement[]>([])
    const [loading, setLoading] = useState(false)

    const fetchMovements = useCallback(async () => {
        if (!roundId) {
            setMovements([])
            return
        }

        setLoading(true)

        const registrationsOf = (id: string) =>
            supabase
                .from("event_players")
                .select("profile_id, registered_at, profiles!inner(first_name, last_name)")
                .eq("round_id", id)

        try {
            const roundIds = previousRoundId ? [roundId, previousRoundId] : [roundId]

            const [roundsRes, currentRes, previousRes] = await Promise.all([
                withTimeout(
                    supabase.from("event_rounds").select("id, round_number").in("id", roundIds),
                    "usePlayerMovements.rounds",
                ),
                withTimeout(registrationsOf(roundId), "usePlayerMovements.current"),
                previousRoundId
                    ? withTimeout(registrationsOf(previousRoundId), "usePlayerMovements.previous")
                    : Promise.resolve({ data: [] as unknown[], error: null }),
            ])

            if (currentRes.error || !currentRes.data) {
                setMovements([])
                return
            }

            const numbers = new Map<string, number>(
                ((roundsRes.data ?? []) as { id: string; round_number: number }[])
                    .map(r => [r.id, r.round_number]),
            )

            const current = (currentRes.data as unknown as RoundPlayerRow[]).filter(r => r.profiles)
            const previous = ((previousRes.data ?? []) as unknown as RoundPlayerRow[]).filter(r => r.profiles)

            const currentIds = new Set(current.map(r => r.profile_id))
            const previousIds = new Set(previous.map(r => r.profile_id))

            const toMovement = (
                row: RoundPlayerRow,
                status: "active" | "inactive",
                round: string,
            ): PlayerMovement => ({
                profileId: row.profile_id,
                firstName: row.profiles!.first_name,
                lastName: row.profiles!.last_name,
                status,
                registeredAt: row.registered_at,
                roundId: round,
                roundNumber: numbers.get(round) ?? 0,
            })

            const results: PlayerMovement[] = [
                // Arrivées : inscrits à la série en cours, absents de la précédente.
                ...current
                    .filter(row => !previousIds.has(row.profile_id))
                    .map(row => toMovement(row, "active", roundId)),
                // Départs : inscrits à la précédente, absents de la série en cours.
                ...(previousRoundId
                    ? previous
                        .filter(row => !currentIds.has(row.profile_id))
                        .map(row => toMovement(row, "inactive", previousRoundId))
                    : []),
            ]

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
    }, [roundId, previousRoundId])

    useEffect(() => {
        fetchMovements()
    }, [fetchMovements])

    return { movements, loading, refetch: fetchMovements }
}

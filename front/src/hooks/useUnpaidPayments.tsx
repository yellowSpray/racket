import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { withTimeout } from "@/lib/handleHookError"

export interface UnpaidPayment {
    id: string
    profileId: string
    firstName: string
    lastName: string
    eventName: string
}

export interface GroupedUnpaidPayment {
    profileId: string
    firstName: string
    lastName: string
    events: string[]
    count: number
}

// type brut retourné par Supabase avant transformation
interface UnpaidPaymentRow {
    id: string
    profile_id: string
    profiles: { first_name: string; last_name: string }
    events: { event_name: string }
}

/**
 * Charge tous les paiements impayés d'un club, tous événements confondus.
 * Les paiements fantômes liés à une mauvaise sélection d'événement
 * sont prévenus en amont (updatePlayer passe p_event_id: null).
 */
export function useUnpaidPayments(clubId: string | null) {
    const [payments, setPayments] = useState<UnpaidPayment[]>([])
    const [loading, setLoading] = useState(false)

    const fetchUnpaidPayments = useCallback(async () => {
        if (!clubId) {
            setPayments([])
            return
        }

        setLoading(true)

        try {
            const { data, error } = await withTimeout(
                supabase
                    .from("payments")
                    .select("id, profile_id, profiles(first_name, last_name), events!inner(event_name, club_id)")
                    .eq("status", "unpaid")
                    .eq("events.club_id", clubId)
                    .order("created_at", { ascending: true }),
                "useUnpaidPayments"
            )

            if (error || !data) {
                setPayments([])
                return
            }

            const rows = data as unknown as UnpaidPaymentRow[]

            setPayments(
                rows.map((row) => ({
                    id: row.id,
                    profileId: row.profile_id,
                    firstName: row.profiles.first_name,
                    lastName: row.profiles.last_name,
                    eventName: row.events.event_name,
                }))
            )
        } catch {
            setPayments([])
        } finally {
            setLoading(false)
        }
    }, [clubId])

    useEffect(() => {
        fetchUnpaidPayments()
    }, [fetchUnpaidPayments])

    // Grouper par joueur, trier du plus endetté au moins endetté
    const grouped: GroupedUnpaidPayment[] = []
    const map = new Map<string, GroupedUnpaidPayment>()
    for (const p of payments) {
        const existing = map.get(p.profileId)
        if (existing) {
            existing.events.push(p.eventName)
            existing.count++
        } else {
            const entry: GroupedUnpaidPayment = {
                profileId: p.profileId,
                firstName: p.firstName,
                lastName: p.lastName,
                events: [p.eventName],
                count: 1,
            }
            map.set(p.profileId, entry)
            grouped.push(entry)
        }
    }
    grouped.sort((a, b) => b.count - a.count)

    return { payments, grouped, loading }
}

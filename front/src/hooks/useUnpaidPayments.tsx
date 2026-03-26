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

// type brut retourné par Supabase avant transformation
interface UnpaidPaymentRow {
    id: string
    profile_id: string
    profiles: { first_name: string; last_name: string }
    events: { event_name: string }
}

/**
 * Charge les paiements impayés d'un club au montage.
 * Filtre via la jointure events.club_id et transforme en objets lisibles.
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

    return { payments, loading }
}

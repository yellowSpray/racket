import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { withTimeout } from "@/lib/handleHookError"

export interface UnpaidPayment {
    id: string
    profileId: string
    firstName: string
    lastName: string
    roundNumber: number
    eventName: string
}

export interface UnpaidRound {
    paymentId: string
    roundNumber: number
    eventName: string
}

export interface GroupedUnpaidPayment {
    profileId: string
    firstName: string
    lastName: string
    rounds: UnpaidRound[]
    count: number
}

/** Ligne brute de la jointure payments > event_rounds > events. */
interface UnpaidPaymentRow {
    id: string
    profile_id: string
    profiles: { first_name: string; last_name: string } | null
    event_rounds: {
        round_number: number
        events: { event_name: string } | null
    } | null
}

/**
 * Les paiements impayés d'un club, toutes séries et tous événements confondus.
 *
 * Le club s'atteint par la série : `payments` ne porte pas de colonne
 * `event_id`, seulement `round_id`. Filtrer directement sur `events.club_id`
 * demandait à PostgREST une jointure qu'il ne sait pas déduire, la requête
 * échouait, et le hook affichait une carte vide en avalant l'erreur.
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
                    .select(`
                        id,
                        profile_id,
                        profiles(first_name, last_name),
                        event_rounds!inner(round_number, events!inner(event_name, club_id))
                    `)
                    .eq("status", "unpaid")
                    .eq("event_rounds.events.club_id", clubId)
                    .order("created_at", { ascending: true }),
                "useUnpaidPayments"
            )

            if (error || !data) {
                setPayments([])
                return
            }

            // Une série supprimée laisse une ligne de paiement orpheline :
            // on l'écarte plutôt que d'afficher un impayé sans intitulé.
            setPayments(
                (data as unknown as UnpaidPaymentRow[])
                    .filter(row => row.event_rounds && row.profiles)
                    .map(row => ({
                        id: row.id,
                        profileId: row.profile_id,
                        firstName: row.profiles!.first_name,
                        lastName: row.profiles!.last_name,
                        roundNumber: row.event_rounds!.round_number,
                        eventName: row.event_rounds!.events?.event_name ?? "",
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

    // Regroupement par joueur, du plus endetté au moins endetté
    const grouped: GroupedUnpaidPayment[] = []
    const map = new Map<string, GroupedUnpaidPayment>()
    for (const p of payments) {
        const round: UnpaidRound = {
            paymentId: p.id,
            roundNumber: p.roundNumber,
            eventName: p.eventName,
        }
        const existing = map.get(p.profileId)
        if (existing) {
            existing.rounds.push(round)
            existing.count++
        } else {
            const entry: GroupedUnpaidPayment = {
                profileId: p.profileId,
                firstName: p.firstName,
                lastName: p.lastName,
                rounds: [round],
                count: 1,
            }
            map.set(p.profileId, entry)
            grouped.push(entry)
        }
    }
    grouped.sort((a, b) => b.count - a.count)

    return { payments, grouped, loading }
}

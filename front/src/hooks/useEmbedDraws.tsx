import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"

/**
 * Tableaux d'une serie, lus sans connexion.
 *
 * La lecture passe par `get_draws_by_embed_token`, en `security definer` :
 * le jeton de l'URL fait office de cle, et la fonction ne rend que ce qui
 * doit etre affiche. Les tables `groups`, `matches` et `profiles` restent
 * fermees au role anonyme, ce hook ne les interroge jamais.
 *
 * @param token - jeton d'integration de l'evenement
 * @param roundNumber - serie a epingler, `null` pour suivre la serie active
 */

export interface EmbedRound {
    round_number: number
    start_date: string | null
    end_date: string | null
    status: string
}

export interface EmbedDraws {
    club_name: string
    logo_url: string | null
    event_name: string
    round: EmbedRound
    groups: Group[]
    matches: Match[]
}

/** Ce que la fonction rend : les joueurs sans telephone ni classement. */
interface EmbedPayload {
    success: boolean
    error?: string
    club_name?: string
    logo_url?: string | null
    event_name?: string
    round?: EmbedRound
    groups?: {
        id: string
        round_id: string
        group_name: string
        max_players: number
        players: { id: string; first_name: string; last_name: string | null }[]
    }[]
    matches?: Match[]
}

export function useEmbedDraws(token: string | undefined, roundNumber: number | null) {
    const [draws, setDraws] = useState<EmbedDraws | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchDraws = useCallback(async () => {
        if (!token) {
            setError("Lien invalide")
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        const { data, error: rpcError } = await supabase.rpc("get_draws_by_embed_token", {
            p_token: token,
            p_round_number: roundNumber,
        })

        if (rpcError) {
            setError("Tableaux indisponibles")
            setDraws(null)
            setLoading(false)
            return
        }

        const payload = data as EmbedPayload | null

        if (!payload?.success) {
            setError(payload?.error ?? "Lien invalide")
            setDraws(null)
            setLoading(false)
            return
        }

        setDraws({
            club_name: payload.club_name ?? "",
            logo_url: payload.logo_url ?? null,
            event_name: payload.event_name ?? "",
            round: payload.round as EmbedRound,
            // `phone` et `power_ranking` ne sortent pas de la base : ils sont
            // remplis de valeurs vides pour satisfaire le type partage avec
            // l'application, et ne sont affiches nulle part sur cette page.
            groups: (payload.groups ?? []).map(g => ({
                id: g.id,
                round_id: g.round_id,
                group_name: g.group_name,
                max_players: g.max_players,
                created_at: "",
                players: g.players.map(p => ({
                    id: p.id,
                    first_name: p.first_name,
                    last_name: p.last_name ?? "",
                    phone: "",
                    power_ranking: 0,
                })),
            })),
            matches: payload.matches ?? [],
        })
        setLoading(false)
    }, [token, roundNumber])

    useEffect(() => {
        fetchDraws()
    }, [fetchDraws])

    return { draws, loading, error, refetch: fetchDraws }
}

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { withTimeout } from "@/lib/handleHookError"
import {
    resolveRules,
    type EffectiveRules,
    type PromotionSource,
    type ScoringSource,
} from "@/lib/effectiveRules"

/**
 * Regles reellement appliquees a un evenement.
 *
 * Les regles vivent a deux niveaux : l'evenement et le club. Jusqu'ici seules
 * celles du club etaient lues, si bien que le bareme et les montees choisis a
 * la creation d'un evenement n'avaient aucun effet. Ce hook lit les deux
 * niveaux et laisse `resolveRules` trancher, ce qui permet enfin a deux
 * evenements d'un meme club de tourner avec des formats differents.
 *
 * Le resultat est toujours exploitable : a defaut de ligne en base, les
 * valeurs par defaut du code s'appliquent. `origin` dit d'ou vient chaque
 * regle, pour que l'interface puisse l'afficher.
 *
 * @param eventId - evenement concerne, `null` si aucun n'est selectionne
 * @param clubId - club de l'utilisateur, `null` tant qu'il n'est pas connu
 */
export function useEffectiveRules(eventId: string | null, clubId: string | null) {
    const [rules, setRules] = useState<EffectiveRules>(() =>
        resolveRules({
            eventScoring: null,
            eventPromotion: null,
            clubScoring: null,
            clubPromotion: null,
        }),
    )
    const [loading, setLoading] = useState(false)

    const fetchRules = useCallback(async () => {
        if (!eventId && !clubId) {
            setRules(
                resolveRules({
                    eventScoring: null,
                    eventPromotion: null,
                    clubScoring: null,
                    clubPromotion: null,
                }),
            )
            return
        }

        setLoading(true)

        const oneRow = <T,>(table: string, column: string, value: string) =>
            withTimeout(
                supabase.from(table).select("*").eq(column, value).maybeSingle(),
                `useEffectiveRules.${table}`,
            ) as Promise<{ data: T | null }>

        const none = Promise.resolve({ data: null })

        try {
            const [eventScoring, eventPromotion, clubScoring, clubPromotion] = await Promise.all([
                eventId ? oneRow<ScoringSource>("event_scoring_rules", "event_id", eventId) : none,
                eventId ? oneRow<PromotionSource>("event_promotion_rules", "event_id", eventId) : none,
                clubId ? oneRow<ScoringSource>("scoring_rules", "club_id", clubId) : none,
                clubId ? oneRow<PromotionSource>("promotion_rules", "club_id", clubId) : none,
            ])

            setRules(
                resolveRules({
                    eventScoring: eventScoring.data as ScoringSource | null,
                    eventPromotion: eventPromotion.data as PromotionSource | null,
                    clubScoring: clubScoring.data as ScoringSource | null,
                    clubPromotion: clubPromotion.data as PromotionSource | null,
                }),
            )
        } catch {
            // Une lecture qui echoue ne doit pas priver l'ecran de tout bareme :
            // on retombe sur les valeurs par defaut plutot que sur rien.
            setRules(
                resolveRules({
                    eventScoring: null,
                    eventPromotion: null,
                    clubScoring: null,
                    clubPromotion: null,
                }),
            )
        } finally {
            setLoading(false)
        }
    }, [eventId, clubId])

    useEffect(() => {
        fetchRules()
    }, [fetchRules])

    return {
        scoring: rules.scoring,
        promotion: rules.promotion,
        loading,
        refetch: fetchRules,
    }
}

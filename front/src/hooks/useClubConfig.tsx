import { supabase } from "@/lib/supabaseClient"
import type { ClubConfig, ScoringRules, PromotionRules } from "@/types/settings"
import { useCallback, useState } from "react"

const DEFAULT_SCORING: Omit<ScoringRules, 'id' | 'club_id' | 'created_at' | 'updated_at'> = {
    score_points: [
        { score: "3-0", winner_points: 5, loser_points: 0 },
        { score: "3-1", winner_points: 4, loser_points: 1 },
        { score: "3-2", winner_points: 3, loser_points: 2 },
        { score: "ABS", winner_points: 3, loser_points: -1 },
    ],
}

const DEFAULT_PROMOTION: Omit<PromotionRules, 'id' | 'club_id' | 'created_at' | 'updated_at'> = {
    promoted_count: 1,
    relegated_count: 1,
}

export function useClubConfig() {

    const [clubConfig, setClubConfig] = useState<ClubConfig | null>(null)
    const [scoringRules, setScoringRules] = useState<ScoringRules | null>(null)
    const [promotionRules, setPromotionRules] = useState<PromotionRules | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const fetchClubConfig = useCallback(async (clubId: string | null) => {
        if (!clubId) {
            setClubConfig(null)
            setScoringRules(null)
            setPromotionRules(null)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const [clubRes, scoringRes, promotionRes] = await Promise.all([
                supabase
                    .from("clubs")
                    .select("id, club_name, club_address, club_email, default_max_players_per_group")
                    .eq("id", clubId)
                    .single(),
                supabase
                    .from("scoring_rules")
                    .select("*")
                    .eq("club_id", clubId)
                    .maybeSingle(),
                supabase
                    .from("promotion_rules")
                    .select("*")
                    .eq("club_id", clubId)
                    .maybeSingle(),
            ])

            if (clubRes.error) {
                setError(clubRes.error.message)
                return
            }

            setClubConfig(clubRes.data)
            setScoringRules(scoringRes.data)
            setPromotionRules(promotionRes.data)

        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }, [])

    const updateClubDefaults = async (clubId: string, data: { default_max_players_per_group: number }) => {
        setError(null)

        const { error: updateError } = await supabase
            .from("clubs")
            .update({ default_max_players_per_group: data.default_max_players_per_group })
            .eq("id", clubId)

        if (updateError) {
            setError(updateError.message)
            return false
        }

        setClubConfig(prev => prev ? { ...prev, ...data } : prev)
        return true
    }

    const upsertScoringRules = async (clubId: string, data: Omit<ScoringRules, 'id' | 'club_id' | 'created_at' | 'updated_at'>) => {
        setError(null)

        const { data: result, error: upsertError } = await supabase
            .from("scoring_rules")
            .upsert(
                { club_id: clubId, ...data, updated_at: new Date().toISOString() },
                { onConflict: 'club_id' }
            )
            .select()
            .single()

        if (upsertError) {
            setError(upsertError.message)
            return false
        }

        setScoringRules(result)
        return true
    }

    const upsertPromotionRules = async (clubId: string, data: Omit<PromotionRules, 'id' | 'club_id' | 'created_at' | 'updated_at'>) => {
        setError(null)

        const { data: result, error: upsertError } = await supabase
            .from("promotion_rules")
            .upsert(
                { club_id: clubId, ...data, updated_at: new Date().toISOString() },
                { onConflict: 'club_id' }
            )
            .select()
            .single()

        if (upsertError) {
            setError(upsertError.message)
            return false
        }

        setPromotionRules(result)
        return true
    }

    return {
        clubConfig,
        scoringRules,
        promotionRules,
        loading,
        error,
        defaultScoring: DEFAULT_SCORING,
        defaultPromotion: DEFAULT_PROMOTION,
        fetchClubConfig,
        updateClubDefaults,
        upsertScoringRules,
        upsertPromotionRules,
    }
}

import { supabase } from "@/lib/supabaseClient"
import type { EventScoringRules, EventPromotionRules } from "@/types/event"
import type { ScorePointsEntry } from "@/types/settings"
import { useCallback, useState } from "react"
import { handleHookError } from "@/lib/handleHookError"

const DEFAULT_SCORE_POINTS: ScorePointsEntry[] = [
    { score: "3-0", winner_points: 5, loser_points: 0 },
    { score: "3-1", winner_points: 4, loser_points: 1 },
    { score: "3-2", winner_points: 3, loser_points: 2 },
    { score: "ABS", winner_points: 3, loser_points: -1 },
]

export function useEventRules() {
    const [scoringRules, setScoringRules] = useState<EventScoringRules | null>(null)
    const [promotionRules, setPromotionRules] = useState<EventPromotionRules | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchEventRules = useCallback(async (eventId: string) => {
        setLoading(true)
        setError(null)
        try {
            const [scoringRes, promotionRes] = await Promise.all([
                supabase
                    .from("event_scoring_rules")
                    .select("*")
                    .eq("event_id", eventId)
                    .maybeSingle(),
                supabase
                    .from("event_promotion_rules")
                    .select("*")
                    .eq("event_id", eventId)
                    .maybeSingle(),
            ])

            setScoringRules(scoringRes.data)
            setPromotionRules(promotionRes.data)
        } catch (err) {
            handleHookError(err, setError, "useEventRules.fetch")
        } finally {
            setLoading(false)
        }
    }, [])

    const upsertEventScoringRules = async (
        eventId: string,
        scorePoints: ScorePointsEntry[]
    ): Promise<boolean> => {
        setError(null)
        const { data, error: upsertError } = await supabase
            .from("event_scoring_rules")
            .upsert(
                { event_id: eventId, score_points: scorePoints, updated_at: new Date().toISOString() },
                { onConflict: "event_id" }
            )
            .select()
            .single()

        if (upsertError) {
            handleHookError(upsertError, setError, "useEventRules.upsertScoring")
            return false
        }
        setScoringRules(data)
        return true
    }

    const upsertEventPromotionRules = async (
        eventId: string,
        promotedCount: number,
        relegatedCount: number
    ): Promise<boolean> => {
        setError(null)
        const { data, error: upsertError } = await supabase
            .from("event_promotion_rules")
            .upsert(
                {
                    event_id: eventId,
                    promoted_count: promotedCount,
                    relegated_count: relegatedCount,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "event_id" }
            )
            .select()
            .single()

        if (upsertError) {
            handleHookError(upsertError, setError, "useEventRules.upsertPromotion")
            return false
        }
        setPromotionRules(data)
        return true
    }

    return {
        scoringRules,
        promotionRules,
        loading,
        error,
        defaultScorePoints: DEFAULT_SCORE_POINTS,
        fetchEventRules,
        upsertEventScoringRules,
        upsertEventPromotionRules,
    }
}

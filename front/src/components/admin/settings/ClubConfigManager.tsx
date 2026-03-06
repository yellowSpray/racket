import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { ScoringRulesCard } from "./ScoringRulesCard"
import { PromotionRulesCard } from "./PromotionRulesCard"
import { GroupSizeCard } from "./GroupSizeCard"
import { ClubConfigSkeleton } from "@/components/shared/skeletons/SettingsSkeleton"

export function ClubConfigManager() {

    const { profile } = useAuth()
    const {
        clubConfig,
        scoringRules,
        promotionRules,
        loading,
        error,
        defaultScoring,
        defaultPromotion,
        fetchClubConfig,
        updateClubDefaults,
        upsertScoringRules,
        upsertPromotionRules,
    } = useClubConfig()

    const clubId = profile?.club_id ?? null

    useEffect(() => {
        fetchClubConfig(clubId)
    }, [clubId, fetchClubConfig])

    if (!clubId) {
        return (
            <div className="text-center py-12 text-gray-500">
                Aucun club associé à votre profil
            </div>
        )
    }

    if (loading) {
        return <ClubConfigSkeleton />
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-500">
                Erreur : {error}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ScoringRulesCard
                    scoringRules={scoringRules}
                    defaultScoring={defaultScoring}
                    onSave={(data) => upsertScoringRules(clubId, data)}
                />

                <PromotionRulesCard
                    promotionRules={promotionRules}
                    defaultPromotion={defaultPromotion}
                    onSave={(data) => upsertPromotionRules(clubId, data)}
                />

                <GroupSizeCard
                    defaultMaxPlayers={clubConfig?.default_max_players_per_group ?? 5}
                    onSave={(data) => updateClubDefaults(clubId, data)}
                />
            </div>
        </div>
    )
}

import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { ScoringRulesCard } from "./ScoringRulesCard"
import { PromotionRulesCard } from "./PromotionRulesCard"
import { GroupSizeCard } from "./GroupSizeCard"
import Loading from "@/components/shared/Loading"

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
        return <Loading />
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
            <div>
                <h2 className="text-2xl font-semibold">Configuration du club</h2>
                {clubConfig && (
                    <p className="text-gray-500 mt-1">{clubConfig.club_name}</p>
                )}
            </div>

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
    )
}

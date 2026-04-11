import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useClubCourts } from "@/hooks/useClubCourts"
import { useInviteLink } from "@/hooks/useInviteLink"
import { ScoringRulesCard } from "./ScoringRulesCard"
import { PromotionRulesCard } from "./PromotionRulesCard"
import { EventDefaultsCard } from "./EventDefaultsCard"
import { ClubCourtsCard } from "./ClubCourtsCard"
import { ClubLogoCard } from "./ClubLogoCard"
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

    const {
        courts: clubCourts,
        loading: courtsLoading,
        error: courtsError,
        fetchClubCourts,
        addClubCourt,
        updateClubCourt,
        removeClubCourt,
        initClubCourts,
    } = useClubCourts()

    const { currentEvent } = useEvent()
    const { getInviteUrl } = useInviteLink()

    const clubId = profile?.club_id ?? null
    const inviteUrl = currentEvent?.invite_token ? getInviteUrl(currentEvent.invite_token) : ""

    useEffect(() => {
        fetchClubConfig(clubId)
        fetchClubCourts(clubId)
    }, [clubId, fetchClubConfig, fetchClubCourts])

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
        <div className="h-full grid grid-rows-3 grid-cols-3 gap-6">
            <ClubLogoCard
                className="row-span-1 row-start-1"
                clubId={clubId}
                logoUrl={clubConfig?.logo_url}
                clubName={clubConfig?.club_name ?? ""}
                onSaved={(url) => fetchClubConfig(clubId)}
            />

            <ScoringRulesCard
                className="row-span-1 row-start-2"
                scoringRules={scoringRules}
                defaultScoring={defaultScoring}
                onSave={(data) => upsertScoringRules(clubId, data)}
            />

            <EventDefaultsCard
                className="row-span-3 row-start-1"
                defaultStartTime={clubConfig?.default_start_time ?? "19:00"}
                defaultEndTime={clubConfig?.default_end_time ?? "23:00"}
                defaultMatchDuration={clubConfig?.default_match_duration ?? 30}
                defaultMinPlayers={clubConfig?.default_min_players_per_group ?? 3}
                defaultMaxPlayers={clubConfig?.default_max_players_per_group ?? 5}
                visitorFee={clubConfig?.visitor_fee ?? 0}
                openToVisitors={clubConfig?.open_to_visitors ?? false}
                autoRenewPlayers={clubConfig?.auto_renew_players ?? false}
                inviteUrl={inviteUrl}
                eventName={currentEvent?.event_name ?? ""}
                onSave={(data) => updateClubDefaults(clubId, data)}
                onToggleVisitors={async (checked) => { await updateClubDefaults(clubId, { open_to_visitors: checked }); fetchClubConfig(clubId) }}
                onToggleAutoRenew={async (checked) => { await updateClubDefaults(clubId, { auto_renew_players: checked }); fetchClubConfig(clubId) }}
            />

            <ClubCourtsCard
                className="row-span-3 row-start-1"
                courts={clubCourts}
                loading={courtsLoading}
                error={courtsError}
                defaultNumberOfCourts={clubConfig?.default_number_of_courts ?? 4}
                defaultStartTime={clubConfig?.default_start_time ?? "19:00"}
                defaultEndTime={clubConfig?.default_end_time ?? "23:00"}
                onAdd={(data) => addClubCourt(clubId, data)}
                onUpdate={updateClubCourt}
                onRemove={removeClubCourt}
                onInit={(n, from, to) => initClubCourts(clubId, n, from, to)}
            />
            
            <PromotionRulesCard
                className="row-span-1 row-start-3"
                promotionRules={promotionRules}
                defaultPromotion={defaultPromotion}
                onSave={(data) => upsertPromotionRules(clubId, data)}
            />
        </div>
    )
}

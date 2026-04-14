import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useClubCourts } from "@/hooks/useClubCourts"
import { ClubCourtsCard } from "./ClubCourtsCard"
import { ClubLogoCard } from "./ClubLogoCard"
import { ClubConfigSkeleton } from "@/components/shared/skeletons/SettingsSkeleton"

export function ClubConfigManager() {
    const { profile } = useAuth()
    const { clubConfig, loading, error, fetchClubConfig } = useClubConfig()

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

    const clubId = profile?.club_id ?? null

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

    if (loading) return <ClubConfigSkeleton />

    if (error) {
        return (
            <div className="text-center py-12 text-red-500">
                Erreur : {error}
            </div>
        )
    }

    return (
        <div className="h-full grid grid-cols-3 gap-6">
            <ClubLogoCard
                clubId={clubId}
                logoUrl={clubConfig?.logo_url}
                clubName={clubConfig?.club_name ?? ""}
                onSaved={() => fetchClubConfig(clubId)}
            />

            <ClubCourtsCard
                className="col-span-2"
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
        </div>
    )
}

import { useEffect } from "react"
import { Navigate } from "react-router"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { PlayersStatusCard } from "@/components/admin/dashboard/PlayersStatusCard"
import { UnpaidPaymentsCard } from "@/components/admin/dashboard/UnpaidPaymentsCard"
import { MatchesCard } from "@/components/admin/dashboard/MatchesCard"
import { AlertsCard } from "@/components/admin/dashboard/AlertsCard"

export function AdminDashboard() {
    const { profile } = useAuth()
    const { currentEvent, events, loading: eventsLoading } = useEvent()
    const { clubConfig, fetchClubConfig } = useClubConfig()

    useEffect(() => {
        fetchClubConfig(profile?.club_id ?? null)
    }, [profile?.club_id, fetchClubConfig])

    // Nouveau club sans event → onboarding guidé
    if (!eventsLoading && events.length === 0) {
        return <Navigate to="/admin/onboarding" replace />
    }

    return (
        <div className="flex flex-col h-full min-h-0 gap-5">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Dashboard</h3>
                {(clubConfig || currentEvent) && (
                    <span className="text-sm text-muted-foreground">
                        - {[clubConfig?.club_name, currentEvent?.event_name].filter(Boolean).join(" - ")}
                    </span>
                )}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-28 grid-rows-16 gap-5">
                <PlayersStatusCard
                    className="col-start-1 col-span-10 row-start-1 row-span-7"
                    eventId={currentEvent?.id ?? null}
                    clubId={currentEvent?.club_id ?? null}
                />
                <UnpaidPaymentsCard
                    className="col-start-11 col-span-9 row-start-1 row-span-7"
                    clubId={profile?.club_id ?? null}
                />
                <AlertsCard className="col-start-20 col-span-9 row-start-1 row-span-7" />
                <MatchesCard
                    className="col-start-1 col-span-28 row-start-8 row-span-9 min-h-0"
                    eventId={currentEvent?.id ?? null}
                />
            </div>
        </div>
    )
}

import { useEffect } from "react"
import { Navigate } from "react-router"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { PlayerMovementsCard } from "@/components/admin/dashboard/PlayerMovementsCard"
import { UnpaidPaymentsCard } from "@/components/admin/dashboard/UnpaidPaymentsCard"
import { TodayMatchesCard } from "@/components/admin/dashboard/TodayMatchesCard"
import { PresencesCard } from "@/components/admin/dashboard/PresencesCard"
import { AlertsCard } from "@/components/admin/dashboard/AlertsCard"
import { PendingScoresCard } from "@/components/admin/dashboard/PendingScoresCard"
import { VisitorRequestsPanel } from "@/components/admin/visitors/VisitorRequestsPanel"

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
                <PlayerMovementsCard
                    className="col-start-1 col-span-7 row-start-1 row-span-7"
                    eventId={currentEvent?.id ?? null}
                    clubId={currentEvent?.club_id ?? null}
                />
                <UnpaidPaymentsCard
                    className="col-start-8 col-span-7 row-start-1 row-span-7"
                    clubId={profile?.club_id ?? null}
                />
                <VisitorRequestsPanel
                    className="col-start-15 col-span-7 row-start-1 row-span-7"
                    eventId={currentEvent?.id ?? null}
                />
                <PresencesCard className="col-start-22 col-span-7 row-start-1 row-span-2" />
                <AlertsCard className="col-start-22 col-span-7 row-start-3 row-span-5" />
                <TodayMatchesCard
                    className="col-start-1 col-span-21 row-start-8 row-span-9 min-h-0"
                    eventId={currentEvent?.id ?? null}
                />
                <PendingScoresCard className="col-start-22 col-span-7 row-start-8 row-span-9 min-h-0" />
            </div>
        </div>
    )
}

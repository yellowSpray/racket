import { useEffect, useMemo } from "react"
import { Navigate } from "react-router"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useHeaderSlot } from "@/contexts/HeaderSlotContext"
import { PlayersStatusCard } from "@/components/admin/dashboard/PlayersStatusCard"
import { UnpaidPaymentsCard } from "@/components/admin/dashboard/UnpaidPaymentsCard"
import { MatchesCard } from "@/components/admin/dashboard/MatchesCard"

export function AdminDashboard() {
    const { profile } = useAuth()
    const { currentEvent, currentRound, events, loading: eventsLoading } = useEvent()

    /** Série qui précède la série en cours dans le même événement. */
    const previousRoundId = useMemo(() => {
        if (!currentRound) return null
        const previous = (currentEvent?.event_rounds ?? [])
            .filter(r => r.round_number < currentRound.round_number)
            .sort((a, b) => b.round_number - a.round_number)[0]
        return previous?.id ?? null
    }, [currentEvent?.event_rounds, currentRound])
    const { clubConfig, fetchClubConfig } = useClubConfig()

    useEffect(() => {
        fetchClubConfig(profile?.club_id ?? null)
    }, [profile?.club_id, fetchClubConfig])

    const headerPortal = useHeaderSlot(
        <>
            <h3 className="text-lg font-semibold">Dashboard</h3>
            {clubConfig && (
                <span className="text-sm text-muted-foreground">
                    - {clubConfig.club_name}
                </span>
            )}
        </>
    )

    // Nouveau club sans event → onboarding guidé
    if (!eventsLoading && events.length === 0) {
        return <Navigate to="/admin/onboarding" replace />
    }

    return (
        <>
            {headerPortal}
            {/*
              * Deux colonnes, et le rail de droite est une largeur, pas une
              * fraction : ses cartes portent des noms et des pastilles, elles
              * ne gagnent rien a s'elargir, alors que le tableau des matchs et
              * ses cinq colonnes prend tout ce qui reste.
              *
              * La chaine de `min-h-0` compte : les trois cartes portent un
              * `ScrollArea` en `h-full`, et sans elle elles cessent de defiler
              * et poussent la page vers le bas.
              */}
            <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px] gap-4">
                <MatchesCard
                    className="min-h-0"
                    roundId={currentRound?.id ?? null}
                />
                <div className="grid min-h-0 grid-rows-2 gap-4">
                    <PlayersStatusCard
                        className="min-h-0"
                        clubId={profile?.club_id ?? null}
                        roundId={currentRound?.id ?? null}
                        previousRoundId={previousRoundId}
                    />
                    <UnpaidPaymentsCard
                        className="min-h-0"
                        clubId={profile?.club_id ?? null}
                    />
                </div>
            </div>
        </>
    )
}

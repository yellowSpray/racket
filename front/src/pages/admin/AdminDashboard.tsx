import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    UserSwitchIcon,
    UserGroupIcon,
    AlertCircleIcon,
    Calendar03Icon,
    TaskEdit01Icon,
    CreditCardIcon,
    FilterIcon,
} from "hugeicons-react"
import { useEffect, useState } from "react"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { TodayMatchesFeed } from "@/components/admin/dashboard/TodayMatchesFeed"
import { PlayerMovementsFeed } from "@/components/admin/dashboard/PlayerMovementsFeed"
import { UnpaidPaymentsFeed } from "@/components/admin/dashboard/UnpaidPaymentsFeed"
import { useTodayMatches } from "@/hooks/useTodayMatches"
import { usePlayerMovements } from "@/hooks/usePlayerMovements"
import { useUnpaidPayments } from "@/hooks/useUnpaidPayments"
import { formatDateLabel } from "@/lib/formatDateLabel"

type MovementFilter = "active" | "inactive"

function MatchProgressBadge({ played, total }: { played: number; total: number }) {
    const allDone = played === total
    const noneStarted = played === 0
    return (
        <Badge
            variant="default"
            className={`text-xs px-2 py-0.5 gap-1.5 ${
                allDone
                    ? "bg-green-500 text-white"
                    : noneStarted
                        ? "bg-gray-200 text-gray-700"
                        : "bg-amber-100 text-amber-700 border border-amber-300"
            }`}
        >
            <span className="relative flex h-2 w-2">
                {!allDone && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                        noneStarted ? "bg-gray-400" : "bg-amber-500"
                    }`} />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${
                    allDone ? "bg-white" : noneStarted ? "bg-gray-500" : "bg-amber-500"
                }`} />
            </span>
            {allDone
                ? `${total} matchs terminés`
                : noneStarted
                    ? `${total} matchs à jouer`
                    : `${played}/${total} joués`
            }
        </Badge>
    )
}

export function AdminDashboard() {
    const { profile } = useAuth()
    const { currentEvent } = useEvent()
    const { clubConfig, fetchClubConfig } = useClubConfig()

    useEffect(() => {
        fetchClubConfig(profile?.club_id ?? null)
    }, [profile?.club_id, fetchClubConfig])
    const todayMatches = useTodayMatches(currentEvent?.id ?? null)
    const playerMovements = usePlayerMovements(currentEvent?.id ?? null, currentEvent?.club_id ?? null)
    const unpaidPayments = useUnpaidPayments(profile?.club_id ?? null)
    const [movementFilter, setMovementFilter] = useState<MovementFilter>("active")

    const filteredMovements = playerMovements.movements.filter((m) => m.status === movementFilter)
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

            {/* Grille 22 colonnes alignée sur le parent */}
            <div className="flex-1 min-h-0 grid grid-cols-28 grid-rows-16 gap-5">
                {/* Mouvements joueurs */}
                <Card className="col-span-7 row-span-7">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <UserSwitchIcon size={16} className="text-foreground" />
                            Mouvements joueurs
                            <button
                                onClick={() => setMovementFilter(movementFilter === "active" ? "inactive" : "active")}
                                className={`ml-auto p-1 rounded-md transition-colors ${
                                    movementFilter === "active"
                                        ? "text-green-500 hover:text-green-600"
                                        : "text-red-400 hover:text-red-500"
                                }`}
                                title={movementFilter === "active" ? "Inscrits" : "Désinscrits"}
                            >
                                <FilterIcon size={14} />
                            </button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PlayerMovementsFeed
                            movements={filteredMovements}
                            loading={playerMovements.loading}
                        />
                    </CardContent>
                </Card>

                {/* Paiements */}
                <Card className="col-span-7 row-span-7">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <CreditCardIcon size={16} className="text-foreground" />
                            Paiements
                            {unpaidPayments.payments.length > 0 && (
                                <Badge
                                    variant="unpaid"
                                    className="ml-auto text-xs px-2 py-0.5"
                                >
                                    {unpaidPayments.payments.length}
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UnpaidPaymentsFeed
                            payments={unpaidPayments.payments}
                            loading={unpaidPayments.loading}
                        />
                    </CardContent>
                </Card>

                {/* Alertes */}
                <Card className="col-span-7 row-span-7">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <AlertCircleIcon size={16} className="text-foreground" />
                            Alertes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                            <AlertCircleIcon size={28} className="mb-3" />
                            <p className="text-sm text-center">Matchs sans résultat, conflits de planning, absences signalées</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Présences */}
                <Card className="col-span-7 row-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <UserGroupIcon size={16} className="text-foreground" />
                            Présences
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center text-gray-400">
                            <UserGroupIcon size={24} className="mb-2" />
                            <p className="text-xs text-center">Confirmations de présence</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Matchs du jour */}
                <Card className="col-span-21 row-span-9 min-h-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Calendar03Icon size={16} className="text-foreground" />
                            Matchs du jour
                            {todayMatches.matchDate && (
                                <span className="text-xs text-muted-foreground font-normal ml-1">
                                    {formatDateLabel(todayMatches.matchDate, todayMatches.isToday)}
                                </span>
                            )}
                            {todayMatches.matches.length > 0 && (
                                <span className="ml-auto">
                                    <MatchProgressBadge
                                        played={todayMatches.matches.filter(m => m.winner_id).length}
                                        total={todayMatches.matches.length}
                                    />
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0">
                        <TodayMatchesFeed
                            matches={todayMatches.matches}
                            matchDate={todayMatches.matchDate}
                            loading={todayMatches.loading}
                        />
                    </CardContent>
                </Card>

                {/* Scores en attente */}
                <Card className="col-span-7 col-start-22 row-start-5 row-span-12 min-h-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <TaskEdit01Icon size={16} className="text-foreground" />
                            Scores en attente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center text-gray-400">
                            <TaskEdit01Icon size={28} className="mb-2" />
                            <p className="text-xs text-center">Résultats à saisir</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

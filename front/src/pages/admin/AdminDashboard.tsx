import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    UserSwitchIcon,
    UserGroupIcon,
    AlertCircleIcon,
    Calendar03Icon,
    TaskEdit01Icon,
    CreditCardIcon,
} from "hugeicons-react"
import { useEvent } from "@/contexts/EventContext"
import { TodayMatchesFeed } from "@/components/admin/dashboard/TodayMatchesFeed"
import { useTodayMatches } from "@/hooks/useTodayMatches"
import { formatDateLabel } from "@/lib/formatDateLabel"

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
    const { currentEvent } = useEvent()
    const todayMatches = useTodayMatches(currentEvent?.id ?? null)
    return (
        <div className="flex flex-col h-full min-h-0 gap-6">
            <h3 className="text-lg font-semibold">Dashboard</h3>

{/* Rangée du haut — 4 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Mouvements joueurs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <UserSwitchIcon size={16} className="text-gray-500" />
                            Mouvements joueurs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                            <UserSwitchIcon size={28} className="mb-3" />
                            <p className="text-sm text-center">Nouvelles inscriptions et désinscriptions pour la série en cours</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Paiements */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <CreditCardIcon size={16} className="text-gray-500" />
                            Paiements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                            <CreditCardIcon size={28} className="mb-3" />
                            <p className="text-sm text-center">Statut des paiements joueurs pour la série en cours</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Présences confirmées */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <UserGroupIcon size={16} className="text-gray-500" />
                            Présences
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                            <UserGroupIcon size={28} className="mb-3" />
                            <p className="text-sm text-center">Joueurs ayant confirmé leur présence pour la prochaine date</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Alertes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <AlertCircleIcon size={16} className="text-gray-500" />
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
            </div>

            {/* Rangée du bas — 2 cards larges */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Feed matchs du jour / lendemain */}
                <Card className="lg:col-span-3 min-h-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Calendar03Icon size={16} className="text-gray-500" />
                            Matchs du jour
                            {todayMatches.matchDate && (
                                <span className="text-xs text-muted-foreground font-normal ml-1">
                                    - {formatDateLabel(todayMatches.matchDate, todayMatches.isToday)}
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
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <TaskEdit01Icon size={16} className="text-gray-500" />
                            Scores en attente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <TaskEdit01Icon size={32} className="mb-3" />
                            <p className="text-sm text-center">Matchs joués dont les résultats n'ont pas encore été saisis ou validés</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

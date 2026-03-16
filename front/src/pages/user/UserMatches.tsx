import { useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useMatches } from "@/hooks/useMatches"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Calendar03Icon,
    MapPinIcon,
    Clock01Icon,
    ChampionIcon,
    Cancel01Icon,
    Target02Icon,
    PercentIcon,
    VolleyballIcon,
} from "hugeicons-react"
import type { Match } from "@/types/match"

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long"
    })
}

function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
        weekday: "short", day: "numeric", month: "short"
    })
}

function getOpponentName(match: Match, myId: string): string {
    if (match.player1_id === myId) {
        return match.player2
            ? `${match.player2.first_name} ${match.player2.last_name}`
            : "Adversaire"
    }
    return match.player1
        ? `${match.player1.first_name} ${match.player1.last_name}`
        : "Adversaire"
}

function getMatchResult(match: Match, myId: string): { label: string; variant: "active" | "inactive" | "pending" } | null {
    if (!match.winner_id) return null
    if (match.score?.includes("ABS")) {
        const isAbsent = (match.score.startsWith("ABS") && match.player1_id === myId) ||
            (match.score.endsWith("ABS") && match.player2_id === myId)
        if (isAbsent) return { label: "Absent", variant: "pending" }
    }
    if (match.winner_id === myId) return { label: "Victoire", variant: "active" }
    return { label: "Défaite", variant: "inactive" }
}

function getMyScore(match: Match, myId: string): string | null {
    if (!match.score) return null
    const parts = match.score.split("-")
    if (parts.length !== 2) return match.score
    return match.player1_id === myId ? `${parts[0]}-${parts[1]}` : `${parts[1]}-${parts[0]}`
}

export function UserMatches() {
    const { profile } = useAuth()
    const { currentEvent } = useEvent()
    const { matches, fetchMatchesByEvent, loading } = useMatches()

    useEffect(() => {
        if (currentEvent?.id) fetchMatchesByEvent(currentEvent.id)
    }, [currentEvent?.id, fetchMatchesByEvent])

    const myMatches = useMemo(() => {
        if (!profile?.id) return []
        return matches
            .filter(m => m.player1_id === profile.id || m.player2_id === profile.id)
            .sort((a, b) => {
                if (a.match_date !== b.match_date) return a.match_date.localeCompare(b.match_date)
                return (a.match_time || "").localeCompare(b.match_time || "")
            })
    }, [matches, profile?.id])

    const { upcoming, played } = useMemo(() => {
        const up: Match[] = []
        const pl: Match[] = []
        for (const m of myMatches) {
            if (m.winner_id) pl.push(m)
            else up.push(m)
        }
        return { upcoming: up, played: pl }
    }, [myMatches])

    const stats = useMemo(() => {
        if (!profile?.id) return { total: 0, wins: 0, losses: 0, absences: 0, ratio: 0 }
        let wins = 0, losses = 0, absences = 0
        for (const m of played) {
            if (m.score?.includes("ABS")) {
                const isAbsent = (m.score.startsWith("ABS") && m.player1_id === profile.id) ||
                    (m.score.endsWith("ABS") && m.player2_id === profile.id)
                if (isAbsent) { absences++; continue }
            }
            if (m.winner_id === profile.id) wins++
            else losses++
        }
        const decided = wins + losses
        return {
            total: myMatches.length,
            wins,
            losses,
            absences,
            ratio: decided > 0 ? Math.round((wins / decided) * 100) : 0
        }
    }, [played, myMatches.length, profile?.id])

    const nextMatch = upcoming[0] ?? null

    if (!currentEvent) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                    <VolleyballIcon size={32} className="mx-auto mb-3" />
                    <p className="text-sm">Aucun événement en cours</p>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full min-h-0 gap-5">
            <h3 className="text-lg font-semibold">Mes matchs</h3>

            <div className="flex-1 min-h-0 grid grid-cols-28 grid-rows-16 gap-5">
                {/* Left panel — Match list */}
                <Card className="col-start-1 col-span-21 row-start-1 row-span-16 min-h-0 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Calendar03Icon size={16} className="text-foreground" />
                            Programme
                            <span className="text-xs text-muted-foreground font-normal ml-1">
                                {myMatches.length} match{myMatches.length > 1 ? "s" : ""}
                            </span>
                            {played.length > 0 && myMatches.length > 0 && (
                                <span className="ml-auto">
                                    <Badge
                                        variant="default"
                                        className={`text-xs px-2 py-0.5 gap-1.5 ${
                                            played.length === myMatches.length
                                                ? "bg-green-500 text-white"
                                                : "bg-amber-100 text-amber-700 border border-amber-300"
                                        }`}
                                    >
                                        <span className="relative flex h-2 w-2">
                                            {played.length < myMatches.length && (
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                                            )}
                                            <span className={`relative inline-flex h-2 w-2 rounded-full ${
                                                played.length === myMatches.length ? "bg-white" : "bg-amber-500"
                                            }`} />
                                        </span>
                                        {played.length}/{myMatches.length} joués
                                    </Badge>
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0">
                        {myMatches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <VolleyballIcon size={28} className="mb-3" />
                                <p className="text-sm">Aucun match programmé</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-full" type="auto">
                                <div className="space-y-5 pr-2">
                                    {upcoming.length > 0 && (
                                        <MatchSection
                                            title="À jouer"
                                            count={upcoming.length}
                                            matches={upcoming}
                                            myId={profile!.id}
                                        />
                                    )}
                                    {played.length > 0 && (
                                        <MatchSection
                                            title="Joués"
                                            count={played.length}
                                            matches={played}
                                            myId={profile!.id}
                                        />
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                {/* Right top — Stats */}
                <Card className="col-start-22 col-span-7 row-start-1 row-span-7">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Target02Icon size={16} className="text-foreground" />
                            Statistiques
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <StatBlock
                                icon={<ChampionIcon size={16} className="text-green-500" />}
                                label="Victoires"
                                value={stats.wins}
                                color="text-green-600"
                            />
                            <StatBlock
                                icon={<Cancel01Icon size={16} className="text-red-400" />}
                                label="Défaites"
                                value={stats.losses}
                                color="text-red-500"
                            />
                            <StatBlock
                                icon={<PercentIcon size={16} className="text-blue-500" />}
                                label="Ratio"
                                value={`${stats.ratio}%`}
                                color="text-blue-600"
                            />
                            <StatBlock
                                icon={<VolleyballIcon size={16} className="text-gray-400" />}
                                label="Total"
                                value={stats.total}
                                color="text-foreground"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Right bottom — Next match */}
                <Card className="col-start-22 col-span-7 row-start-8 row-span-9 min-h-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Clock01Icon size={16} className="text-foreground" />
                            Prochain match
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {nextMatch ? (
                            <NextMatchDetail match={nextMatch} myId={profile!.id} />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <Clock01Icon size={28} className="mb-3" />
                                <p className="text-sm text-center">
                                    {myMatches.length === 0
                                        ? "Aucun match prévu"
                                        : "Tous les matchs sont joués"
                                    }
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function MatchSection({ title, count, matches, myId }: {
    title: string
    count: number
    matches: Match[]
    myId: string
}) {
    return (
        <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {title} ({count})
            </h2>
            <div className="space-y-1.5">
                {matches.map(match => (
                    <MatchRow key={match.id} match={match} myId={myId} />
                ))}
            </div>
        </div>
    )
}

function MatchRow({ match, myId }: { match: Match; myId: string }) {
    const opponent = getOpponentName(match, myId)
    const result = getMatchResult(match, myId)
    const score = getMyScore(match, myId)

    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border hover:border-blue-400 transition-colors">
            {/* Date compact */}
            <div className="w-16 shrink-0 text-center">
                <p className="text-xs font-medium text-foreground leading-tight">
                    {formatDateShort(match.match_date)}
                </p>
                {match.match_time && (
                    <p className="text-[11px] text-muted-foreground">{match.match_time.slice(0, 5)}</p>
                )}
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-border shrink-0" />

            {/* Opponent + group */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">vs {opponent}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    {match.group?.group_name && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            {match.group.group_name}
                        </Badge>
                    )}
                    {match.court_number && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <MapPinIcon size={11} />
                            T{match.court_number}
                        </span>
                    )}
                </div>
            </div>

            {/* Score + Result */}
            <div className="flex items-center gap-2 shrink-0">
                {score && (
                    <span className="text-sm font-mono font-medium">{score}</span>
                )}
                {result && (
                    <Badge variant={result.variant}>{result.label}</Badge>
                )}
            </div>
        </div>
    )
}

function StatBlock({ icon, label, value, color }: {
    icon: React.ReactNode
    label: string
    value: number | string
    color: string
}) {
    return (
        <div className="flex flex-col items-center gap-1 py-2">
            {icon}
            <span className={`text-xl font-bold ${color}`}>{value}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
    )
}

function NextMatchDetail({ match, myId }: { match: Match; myId: string }) {
    const opponent = getOpponentName(match, myId)

    return (
        <div className="flex flex-col gap-4">
            {/* Opponent highlight */}
            <div className="text-center py-3">
                <p className="text-xs text-muted-foreground mb-1">Adversaire</p>
                <p className="text-lg font-bold">{opponent}</p>
                {match.group?.group_name && (
                    <Badge variant="default" className="mt-2 text-xs">
                        {match.group.group_name}
                    </Badge>
                )}
            </div>

            {/* Details */}
            <div className="space-y-2.5 border-t pt-3">
                <div className="flex items-center gap-2 text-sm">
                    <Calendar03Icon size={14} className="text-muted-foreground shrink-0" />
                    <span className="capitalize">{formatDate(match.match_date)}</span>
                </div>
                {match.match_time && (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock01Icon size={14} className="text-muted-foreground shrink-0" />
                        <span>{match.match_time.slice(0, 5)}</span>
                    </div>
                )}
                {match.court_number && (
                    <div className="flex items-center gap-2 text-sm">
                        <MapPinIcon size={14} className="text-muted-foreground shrink-0" />
                        <span>Terrain {match.court_number}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

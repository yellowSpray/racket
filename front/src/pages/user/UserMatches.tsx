import { useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useMatches } from "@/hooks/useMatches"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/badge"
import { Calendar03Icon, MapPinIcon } from "hugeicons-react"
import type { Match } from "@/types/match"

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long"
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

function getMatchResult(match: Match, myId: string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } | null {
    if (!match.winner_id) return null
    if (match.score?.includes("ABS")) {
        const isAbsent = (match.score.startsWith("ABS") && match.player1_id === myId) ||
            (match.score.endsWith("ABS") && match.player2_id === myId)
        if (isAbsent) return { label: "Absent", variant: "secondary" }
    }
    if (match.winner_id === myId) return { label: "Victoire", variant: "default" }
    return { label: "Défaite", variant: "destructive" }
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

    if (!currentEvent) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Aucun événement en cours
            </div>
        )
    }

    if (loading) return <p className="text-gray-500">Chargement...</p>

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Mes matchs</h3>

            {myMatches.length === 0 ? (
                <p className="text-gray-500">Aucun match programmé</p>
            ) : (
                <>
                    {upcoming.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase">À jouer ({upcoming.length})</h2>
                            <div className="space-y-2">
                                {upcoming.map(match => (
                                    <MatchCard key={match.id} match={match} myId={profile!.id} />
                                ))}
                            </div>
                        </div>
                    )}

                    {played.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase">Joués ({played.length})</h2>
                            <div className="space-y-2">
                                {played.map(match => (
                                    <MatchCard key={match.id} match={match} myId={profile!.id} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function MatchCard({ match, myId }: { match: Match; myId: string }) {
    const opponent = getOpponentName(match, myId)
    const result = getMatchResult(match, myId)

    return (
        <Card className="py-3">
            <CardContent className="flex items-center justify-between gap-4 px-4 py-0">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">vs {opponent}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                            <Calendar03Icon size={13} />
                            {formatDate(match.match_date)}
                        </span>
                        {match.match_time && (
                            <span>{match.match_time.slice(0, 5)}</span>
                        )}
                        {match.court_number && (
                            <span className="flex items-center gap-1">
                                <MapPinIcon size={13} />
                                T{match.court_number}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {match.score && (
                        <span className="text-sm font-mono">{match.score}</span>
                    )}
                    {result && (
                        <Badge variant={result.variant}>{result.label}</Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

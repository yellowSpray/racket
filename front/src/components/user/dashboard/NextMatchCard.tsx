import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/badge"
import { Clock01Icon, Calendar03Icon, MapPinIcon } from "hugeicons-react"
import { formatDate, getOpponentName } from "@/lib/matchUtils"
import type { Match } from "@/types/match"

interface NextMatchCardProps {
    nextMatch: Match | null
    myId: string
    totalMatches: number
    className?: string
}

export function NextMatchCard({ nextMatch, myId, totalMatches, className }: NextMatchCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock01Icon size={16} className="text-foreground" />
                    Prochain match
                </CardTitle>
            </CardHeader>
            <CardContent>
                {nextMatch ? (
                    <NextMatchDetail match={nextMatch} myId={myId} />
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Clock01Icon size={28} className="mb-3" />
                        <p className="text-sm text-center">
                            {totalMatches === 0 ? "Aucun match prévu" : "Tous les matchs sont joués"}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function NextMatchDetail({ match, myId }: { match: Match; myId: string }) {
    const opponent = getOpponentName(match, myId)

    return (
        <div className="flex flex-col gap-3">
            <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Adversaire</p>
                <p className="text-base font-bold">{opponent}</p>
                {match.group?.group_name && (
                    <Badge variant="default" className="mt-1.5 text-xs">
                        {match.group.group_name}
                    </Badge>
                )}
            </div>
            <div className="space-y-2 border-t pt-2.5">
                <div className="flex items-center gap-2 text-sm">
                    <Calendar03Icon size={13} className="text-muted-foreground shrink-0" />
                    <span className="capitalize text-xs">{formatDate(match.match_date)}</span>
                </div>
                {match.match_time && (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock01Icon size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-xs">{match.match_time.slice(0, 5)}</span>
                    </div>
                )}
                {match.court_number && (
                    <div className="flex items-center gap-2 text-sm">
                        <MapPinIcon size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-xs">Terrain {match.court_number}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

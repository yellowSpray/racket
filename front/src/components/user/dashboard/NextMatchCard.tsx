import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Clock01Icon, Calendar03Icon, Location01Icon, CheckmarkCircle02Icon, CancelCircleIcon } from "hugeicons-react"
import type { Match } from "@/types/match"

interface NextMatchCardProps {
    nextMatch: Match | null
    myId: string
    totalMatches: number
    className?: string
    myAvatarUrl?: string
    myName?: string
}

function getInitials(firstName?: string, lastName?: string): string {
    return `${(firstName?.[0] ?? "").toUpperCase()}${(lastName?.[0] ?? "").toUpperCase()}`
}

function getPlayerInfo(match: Match, myId: string) {
    const isPlayer1 = match.player1_id === myId
    const me = isPlayer1 ? match.player1 : match.player2
    const opponent = isPlayer1 ? match.player2 : match.player1
    return { me, opponent }
}

export function NextMatchCard({ nextMatch, myId, totalMatches, className, myAvatarUrl, myName }: NextMatchCardProps) {
    return (
        <Card className={`${className} flex flex-col`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock01Icon size={16} className="text-foreground" />
                    Prochain match
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {nextMatch ? (
                    <NextMatchDetail match={nextMatch} myId={myId} myAvatarUrl={myAvatarUrl} myName={myName} />
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

function NextMatchDetail({ match, myId, myAvatarUrl, myName }: { match: Match; myId: string; myAvatarUrl?: string; myName?: string }) {
    const { me, opponent } = getPlayerInfo(match, myId)

    const myInitials = myName
        ? getInitials(myName.split(" ")[0], myName.split(" ")[1])
        : getInitials(me?.first_name, me?.last_name)
    const opponentInitials = getInitials(opponent?.first_name, opponent?.last_name)
    const opponentName = opponent ? opponent.first_name : "Adversaire"
    const displayMyName = myName?.split(" ")[0] ?? me?.first_name ?? "Moi"

    return (
        <div className="flex flex-col items-center justify-evenly h-full">
            {/* Face-to-face section */}
            <div className="flex items-center justify-center w-full">
                <div className="flex items-center gap-2 w-full">
                    {/* My side */}
                    <div className="flex-1 flex flex-col items-center gap-1.5">
                        <Avatar className="size-14 xl:size-18 2xl:size-20 ring-2 ring-primary/30">
                            <AvatarImage src={myAvatarUrl ?? me?.avatar_url} alt={displayMyName} />
                            <AvatarFallback className="text-sm xl:text-base font-bold bg-primary/15 text-primary">
                                {myInitials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs xl:text-sm font-semibold text-center truncate max-w-full">
                            {displayMyName}
                        </span>
                    </div>

                    {/* VS + box */}
                    <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] xl:text-xs font-bold text-muted-foreground tracking-widest uppercase">vs</span>
                        {match.group?.group_name && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                {match.group.group_name}
                            </Badge>
                        )}
                    </div>

                    {/* Opponent side */}
                    <div className="flex-1 flex flex-col items-center gap-1.5">
                        <Avatar className="size-14 xl:size-18 2xl:size-20 ring-2 ring-muted-foreground/20">
                            <AvatarImage src={opponent?.avatar_url} alt={opponentName} />
                            <AvatarFallback className="text-sm xl:text-base font-bold">
                                {opponentInitials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs xl:text-sm font-semibold text-center truncate max-w-full">
                            {opponentName}
                        </span>
                    </div>
                </div>
            </div>

            {/* Match info */}
            <div className="flex gap-2 py-2 w-full">
                <div className="flex-1 flex flex-col items-center gap-1 py-3 xl:py-4 rounded-lg bg-muted">
                    <Calendar03Icon size={13} className="text-foreground" />
                    <span className="text-[10px] xl:text-xs text-foreground capitalize">
                        {new Date(match.match_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </span>
                </div>
                {match.match_time && (
                    <div className="flex-1 flex flex-col items-center gap-1 py-3 xl:py-4 rounded-lg bg-muted">
                        <Clock01Icon size={13} className="text-foreground" />
                        <span className="text-[10px] xl:text-xs text-foreground">{match.match_time.slice(0, 5)}</span>
                    </div>
                )}
                {match.court_number && (
                    <div className="flex-1 flex flex-col items-center gap-1 py-3 xl:py-4 rounded-lg bg-muted">
                        <Location01Icon size={13} className="text-foreground" />
                        <span className="text-[10px] xl:text-xs text-foreground">{match.court_number}</span>
                    </div>
                )}
            </div>

            {/* Presence buttons */}
            <div className="flex gap-2 pt-1 w-full">
                <Button variant="outline" size="lg" className="flex-1 gap-1.5 text-xs xl:text-sm">
                    <CancelCircleIcon size={14} />
                    Absent
                </Button>
                <Button variant="default" size="lg" className="flex-1 gap-1.5 text-xs xl:text-sm">
                    <CheckmarkCircle02Icon size={14} />
                    Présent
                </Button>
            </div>
        </div>
    )
}

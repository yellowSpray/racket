import type { Match } from "@/types/match"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar03Icon } from "hugeicons-react"

function formatTime(matchTime: string): string {
    const m = matchTime.match(/^(\d{2}:\d{2})/)
    return m ? m[1] : matchTime
}


function groupByTimeSlot(matches: Match[]): Map<string, Match[]> {
    const groups = new Map<string, Match[]>()
    for (const match of matches) {
        const time = formatTime(match.match_time)
        const existing = groups.get(time)
        if (existing) {
            existing.push(match)
        } else {
            groups.set(time, [match])
        }
    }
    return groups
}

interface TodayMatchesFeedProps {
    matches: Match[]
    matchDate: string | null
    loading: boolean
}

export function TodayMatchesFeed({ matches, matchDate, loading }: TodayMatchesFeedProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (!matchDate || matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Calendar03Icon size={28} className="mb-3" />
                <p className="text-sm">Aucun match programmé</p>
            </div>
        )
    }

    const timeSlots = groupByTimeSlot(matches)

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full" type="auto">
                    <div className="flex flex-col gap-4">
                        {Array.from(timeSlots.entries()).map(([time, slotMatches]) => (
                            <div key={time}>
                                {/* Desktop : table avec header heure */}
                                <div className="hidden md:block overflow-hidden rounded-md border">
                                    <Table className="table-fixed">
                                        <colgroup>
                                            <col className="w-[10%]" />
                                            <col className="w-[20%]" />
                                            <col className="w-[10%]" />
                                            <col className="w-[20%]" />
                                            <col className="w-[10%]" />
                                            <col className="w-[10%]" />
                                        </colgroup>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead colSpan={6} className="text-xs font-semibold h-8">
                                                    {time}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {slotMatches.map((match) => (
                                                <MatchTableRow key={match.id} match={match} />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile : cards empilées */}
                                <div className="md:hidden flex flex-col gap-2">
                                    <p className="text-xs font-semibold">{time}</p>
                                    {slotMatches.map((match) => (
                                        <MatchCard key={match.id} match={match} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

function MatchCard({ match }: { match: Match }) {
    const hasResult = !!match.winner_id && !!match.score
    const isP1Winner = match.winner_id === match.player1_id
    const isP2Winner = match.winner_id === match.player2_id

    const p1Name = match.player1
        ? `${match.player1.first_name} ${match.player1.last_name}`
        : "?"
    const p2Name = match.player2
        ? `${match.player2.first_name} ${match.player2.last_name}`
        : "?"

    return (
        <div className="rounded-md border p-3 text-sm flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {match.group?.group_name && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            {match.group.group_name}
                        </Badge>
                    )}
                    {match.court_number && (
                        <span className="text-xs text-muted-foreground">Terrain {match.court_number}</span>
                    )}
                </div>
                {hasResult ? (
                    match.score?.includes("ABS") ? (
                        <span className="text-xs text-amber-600 font-medium">Absent</span>
                    ) : (
                        <span className="text-xs text-green-600 font-medium">{match.score}</span>
                    )
                ) : (
                    <span className="text-xs text-gray-400">en attente</span>
                )}
            </div>
            <div className="flex items-center gap-1.5">
                <span className={`truncate ${isP1Winner ? "font-semibold text-green-600" : ""}`}>
                    {p1Name}
                </span>
                <span className="text-gray-400 shrink-0">vs</span>
                <span className={`truncate ${isP2Winner ? "font-semibold text-green-600" : ""}`}>
                    {p2Name}
                </span>
            </div>
        </div>
    )
}

function MatchTableRow({ match }: { match: Match }) {
    const hasResult = !!match.winner_id && !!match.score
    const isP1Winner = match.winner_id === match.player1_id
    const isP2Winner = match.winner_id === match.player2_id

    const p1Name = match.player1
        ? `${match.player1.first_name} ${match.player1.last_name}`
        : "?"
    const p2Name = match.player2
        ? `${match.player2.first_name} ${match.player2.last_name}`
        : "?"

    return (
        <TableRow>
            <TableCell>
                {match.group?.group_name && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        {match.group.group_name}
                    </Badge>
                )}
            </TableCell>
            <TableCell className={`text-right truncate ${isP1Winner ? "font-semibold text-green-600" : ""}`}>
                {p1Name}
            </TableCell>
            <TableCell className="text-center text-gray-400">vs</TableCell>
            <TableCell className={`truncate ${isP2Winner ? "font-semibold text-green-600" : ""}`}>
                {p2Name}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {match.court_number ? `${match.court_number}` : "—"}
            </TableCell>
            <TableCell>
                {hasResult ? (
                    match.score?.includes("ABS") ? (
                        <span className="text-amber-600 font-medium">Absent</span>
                    ) : (
                        <span className="text-green-600 font-medium">{match.score}</span>
                    )
                ) : (
                    <span className="text-gray-400">en attente</span>
                )}
            </TableCell>
        </TableRow>
    )
}

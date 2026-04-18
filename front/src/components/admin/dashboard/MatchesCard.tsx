import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar03Icon, Clock01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"
import { useMatchesByDay, type DayMatch, type MatchDay } from "@/hooks/useMatchesByDay"

const SCORE_OPTIONS = [
    { value: "", label: "Score…" },
    { value: "3-0", label: "3 – 0" },
    { value: "3-1", label: "3 – 1" },
    { value: "3-2", label: "3 – 2" },
    { value: "0-3", label: "0 – 3" },
    { value: "1-3", label: "1 – 3" },
    { value: "2-3", label: "2 – 3" },
    { value: "ABS-0", label: "Abs P1" },
    { value: "0-ABS", label: "Abs P2" },
]

function formatTime(matchTime: string): string {
    const m = matchTime.match(/^(\d{2}:\d{2})/)
    return m ? m[1] : matchTime
}

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

interface MatchesCardProps {
    eventId: string | null
    className?: string
}

export function MatchesCard({ eventId, className }: MatchesCardProps) {
    const { days, loading, initialDayIndex, resolveScore } = useMatchesByDay(eventId)
    const [dayIndex, setDayIndex] = useState(0)
    const [scoreSelections, setScoreSelections] = useState<Map<string, string>>(new Map())

    useEffect(() => {
        setDayIndex(initialDayIndex)
    }, [initialDayIndex])

    const handleScoreChange = useCallback((matchId: string, value: string) => {
        setScoreSelections(prev => new Map(prev).set(matchId, value))
    }, [])

    const handleValidate = useCallback(async (match: DayMatch, score: string) => {
        if (!score) return
        const ok = await resolveScore(match.id, score, match.player1_id, match.player2_id)
        if (ok) {
            setScoreSelections(prev => {
                const next = new Map(prev)
                next.delete(match.id)
                return next
            })
        }
    }, [resolveScore])

    const currentDay = days[dayIndex]
    const played = currentDay?.matches.filter(m => m.status === "done").length ?? 0
    const total = currentDay?.matches.length ?? 0

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Calendar03Icon size={16} className="text-foreground shrink-0" />
                    <span className="font-semibold shrink-0">Matchs</span>
                    <button
                        onClick={() => setDayIndex(i => i - 1)}
                        disabled={dayIndex === 0 || days.length === 0}
                        className="p-0.5 rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        aria-label="Jour précédent"
                    >
                        <ArrowLeft01Icon size={14} />
                    </button>
                    {currentDay && (
                        <>
                            <span className="text-xs text-muted-foreground font-normal truncate">
                                {currentDay.label}
                            </span>
                            {currentDay.isToday && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0 bg-primary text-primary-foreground">
                                    aujourd'hui
                                </Badge>
                            )}
                        </>
                    )}
                    <button
                        onClick={() => setDayIndex(i => i + 1)}
                        disabled={dayIndex >= days.length - 1 || days.length === 0}
                        className="p-0.5 rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        aria-label="Jour suivant"
                    >
                        <ArrowRight01Icon size={14} />
                    </button>
                    {total > 0 && (
                        <span className="ml-auto shrink-0">
                            <MatchProgressBadge played={played} total={total} />
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        <p className="text-sm">Chargement...</p>
                    </div>
                ) : !currentDay ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Calendar03Icon size={28} className="mb-3" />
                        <p className="text-sm">Aucun match programmé</p>
                    </div>
                ) : (
                    <MatchesFeed
                        day={currentDay}
                        scoreSelections={scoreSelections}
                        onScoreChange={handleScoreChange}
                        onValidate={handleValidate}
                    />
                )}
            </CardContent>
        </Card>
    )
}

interface MatchesFeedProps {
    day: MatchDay
    scoreSelections: Map<string, string>
    onScoreChange: (matchId: string, value: string) => void
    onValidate: (match: DayMatch, score: string) => Promise<void>
}

function MatchesFeed({ day, scoreSelections, onScoreChange, onValidate }: MatchesFeedProps) {
    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full" type="auto">
                    {/* Desktop : tableau */}
                    <div className="hidden md:block overflow-hidden">
                        <Table className="table-fixed">
                            <colgroup>
                                <col className="w-[8%]" />
                                <col className="w-[9%]" />
                                <col className="w-[42%]" />
                                <col className="w-[8%]" />
                                <col className="w-[33%]" />
                            </colgroup>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-[10px] text-muted-foreground h-7">Heure</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground h-7">Boxe</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground h-7">Match</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground h-7">Terrain</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground h-7 text-right">Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {day.matches.map((match, index) => {
                                    const currentTime = formatTime(match.match_time)
                                    const nextTime = index < day.matches.length - 1
                                        ? formatTime(day.matches[index + 1].match_time)
                                        : null
                                    const isLastOfSlot = currentTime !== nextTime
                                    return (
                                        <MatchTableRow
                                            key={match.id}
                                            match={match}
                                            isLastOfSlot={isLastOfSlot}
                                            scoreSelections={scoreSelections}
                                            onScoreChange={onScoreChange}
                                            onValidate={onValidate}
                                        />
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile : cartes */}
                    <div className="md:hidden flex flex-col gap-2">
                        {day.matches.map(match => (
                            <MatchMobileCard
                                key={match.id}
                                match={match}
                                scoreSelections={scoreSelections}
                                onScoreChange={onScoreChange}
                                onValidate={onValidate}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

interface MatchRowProps {
    match: DayMatch
    isLastOfSlot: boolean
    scoreSelections: Map<string, string>
    onScoreChange: (matchId: string, value: string) => void
    onValidate: (match: DayMatch, score: string) => Promise<void>
}

function MatchTableRow({ match, isLastOfSlot, scoreSelections, onScoreChange, onValidate }: MatchRowProps) {
    const isP1Winner = match.winner_id === match.player1_id
    const isP2Winner = match.winner_id === match.player2_id
    const p1Name = match.player1 ? `${match.player1.first_name} ${match.player1.last_name}` : "?"
    const p2Name = match.player2 ? `${match.player2.first_name} ${match.player2.last_name}` : "?"

    const initialScore = match.status === "waiting_one"
        ? (match.pending_score_p1 ?? match.pending_score_p2 ?? "")
        : ""
    const selectedScore = scoreSelections.get(match.id) ?? initialScore

    return (
        <TableRow className={isLastOfSlot ? "border-b" : "border-b-0"}>
            <TableCell className="text-xs font-medium">
                <div className="flex items-center gap-1">
                    <Clock01Icon size={13} className="text-muted-foreground shrink-0" />
                    {formatTime(match.match_time)}
                </div>
            </TableCell>
            <TableCell>
                {match.group?.group_name && (
                    <Badge variant="default" className="text-xs px-2 py-0.5">
                        {match.group.group_name}
                    </Badge>
                )}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-1.5">
                    <span className={`truncate ${isP1Winner ? "font-semibold text-green-600" : ""}`}>
                        {p1Name}
                    </span>
                    <span className="text-gray-400 shrink-0 text-xs">vs</span>
                    <span className={`truncate ${isP2Winner ? "font-semibold text-green-600" : ""}`}>
                        {p2Name}
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
                {match.court_number ?? "—"}
            </TableCell>
            <TableCell>
                <ScoreCell
                    match={match}
                    selectedScore={selectedScore}
                    onScoreChange={onScoreChange}
                    onValidate={onValidate}
                />
            </TableCell>
        </TableRow>
    )
}

interface MatchMobileCardProps {
    match: DayMatch
    scoreSelections: Map<string, string>
    onScoreChange: (matchId: string, value: string) => void
    onValidate: (match: DayMatch, score: string) => Promise<void>
}

function MatchMobileCard({ match, scoreSelections, onScoreChange, onValidate }: MatchMobileCardProps) {
    const isP1Winner = match.winner_id === match.player1_id
    const isP2Winner = match.winner_id === match.player2_id
    const p1Name = match.player1 ? `${match.player1.first_name} ${match.player1.last_name}` : "?"
    const p2Name = match.player2 ? `${match.player2.first_name} ${match.player2.last_name}` : "?"

    const initialScore = match.status === "waiting_one"
        ? (match.pending_score_p1 ?? match.pending_score_p2 ?? "")
        : ""
    const selectedScore = scoreSelections.get(match.id) ?? initialScore

    return (
        <div className="rounded-md border p-3 text-sm flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {formatTime(match.match_time)}
                    </span>
                    {match.group?.group_name && (
                        <Badge variant="default" className="text-xs px-2 py-0.5 shrink-0">
                            {match.group.group_name}
                        </Badge>
                    )}
                    {match.court_number && (
                        <span className="text-xs text-muted-foreground shrink-0">T{match.court_number}</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                <span className={`truncate text-sm ${isP1Winner ? "font-semibold text-green-600" : ""}`}>
                    {p1Name}
                </span>
                <span className="text-gray-400 shrink-0 text-xs">vs</span>
                <span className={`truncate text-sm ${isP2Winner ? "font-semibold text-green-600" : ""}`}>
                    {p2Name}
                </span>
            </div>
            <ScoreCell
                match={match}
                selectedScore={selectedScore}
                onScoreChange={onScoreChange}
                onValidate={onValidate}
                compact
            />
        </div>
    )
}

interface ScoreCellProps {
    match: DayMatch
    selectedScore: string
    onScoreChange: (matchId: string, value: string) => void
    onValidate: (match: DayMatch, score: string) => Promise<void>
    compact?: boolean
}

function ScoreCell({ match, selectedScore, onScoreChange, onValidate, compact }: ScoreCellProps) {
    const alignClass = compact ? "" : "justify-end"

    if (match.status === "done") {
        const isAbs = match.score?.includes("ABS")
        return (
            <div className={`flex ${alignClass}`}>
                <Badge
                    variant={isAbs ? "pending" : "active"}
                    className="text-xs px-2 py-0.5"
                >
                    {isAbs ? "Absent" : match.score}
                </Badge>
            </div>
        )
    }

    if (match.status === "conflict") {
        return (
            <div className="flex flex-col gap-1">
                <div className={`flex ${alignClass}`}>
                    <Badge variant="unpaid" className="text-[10px] px-1.5 py-0">Conflit</Badge>
                </div>
                <div className="flex items-center gap-1 justify-end">
                    <span className="text-muted-foreground text-[10px]">P1 :</span>
                    <span className="font-mono font-medium text-[11px]">{match.pending_score_p1}</span>
                    <button
                        onClick={() => onValidate(match, match.pending_score_p1!)}
                        aria-label="Valider"
                        className="text-[10px] px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                        Valider
                    </button>
                </div>
                <div className="flex items-center gap-1 justify-end">
                    <span className="text-muted-foreground text-[10px]">P2 :</span>
                    <span className="font-mono font-medium text-[11px]">{match.pending_score_p2}</span>
                    <button
                        onClick={() => onValidate(match, match.pending_score_p2!)}
                        aria-label="Valider"
                        className="text-[10px] px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                        Valider
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-1.5 ${alignClass}`}>
            <Badge
                variant={match.status === "waiting_one" ? "pending" : "inactive"}
                className="text-[10px] px-1.5 py-0 shrink-0"
            >
                {match.status === "waiting_one" ? "En attente" : "À saisir"}
            </Badge>
            <select
                aria-label={`Score pour ${match.player1?.first_name ?? "P1"} vs ${match.player2?.first_name ?? "P2"}`}
                value={selectedScore}
                onChange={(e) => onScoreChange(match.id, e.target.value)}
                className="h-6 text-[11px] border border-gray-300 rounded px-1 bg-white"
            >
                {SCORE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <button
                onClick={() => onValidate(match, selectedScore)}
                disabled={!selectedScore}
                aria-label="Valider"
                className="text-[10px] px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
                Valider
            </button>
        </div>
    )
}

import type { Match } from "@/types/match"
import type { PlayerType } from "@/types/player"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowDown01Icon, ArrowUp01Icon } from "hugeicons-react"

interface MatchListViewProps {
    matches: Match[]
    players: PlayerType[]
    searchQuery?: string
    editMode?: boolean
    pendingScores?: Map<string, string>
    onScoreChange?: (matchId: string, value: string) => void
    playerAbsences?: Map<string, string[]>
}

const SCORE_OPTIONS = [
    { value: "", label: "-" },
    { value: "0", label: "0" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "ABS", label: "ABS" },
]

function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
    }).replace('.', '')
}

function formatTime(matchTime: string | null): string {
    if (!matchTime) return "-"
    const m = matchTime.match(/(\d{2}:\d{2})/)
    return m ? m[1] : matchTime
}

function formatPlayerName(player: { first_name: string; last_name: string } | undefined): string {
    if (!player) return "?"
    return `${player.first_name} ${player.last_name}`
}

function buildRestrictionsMap(players: PlayerType[]): Map<string, { arrival: string; departure: string }> {
    const map = new Map<string, { arrival: string; departure: string }>()
    for (const p of players) {
        if (p.arrival || p.departure) {
            map.set(p.id, { arrival: p.arrival || "", departure: p.departure || "" })
        }
    }
    return map
}

function RestrictionDisplay({ restrictions, playerId }: { restrictions: Map<string, { arrival: string; departure: string }>; playerId: string | undefined }) {
    if (!playerId) return <span>-</span>
    const r = restrictions.get(playerId)
    if (!r || (!r.arrival && !r.departure)) return <span>-</span>
    return (
        <span className="inline-flex items-center gap-1">
            {r.arrival && (
                <span className="inline-flex items-center gap-0.5">
                    <ArrowDown01Icon className="h-3 w-3" />{r.arrival}
                </span>
            )}
            {r.departure && (
                <span className="inline-flex items-center gap-0.5">
                    <ArrowUp01Icon className="h-3 w-3" />{r.departure}
                </span>
            )}
        </span>
    )
}

/** Parse "3-1" → ["3", "1"] */
function parseScoreValue(value: string | undefined): [string, string] {
    if (!value) return ["", ""]
    if (value === "WO") return ["", ""]
    const parts = value.split("-")
    if (parts.length === 2) return [parts[0], parts[1]]
    return ["", ""]
}

function ScoreEditor({ matchId, scoreValue, onScoreChange }: {
    matchId: string
    scoreValue: string | undefined
    onScoreChange?: (matchId: string, value: string) => void
}) {
    const [score1, score2] = parseScoreValue(scoreValue)

    const handleScorePartChange = (part: 1 | 2, value: string) => {
        let s1 = part === 1 ? value : score1
        let s2 = part === 2 ? value : score2
        if (value === "ABS") {
            if (part === 1) s2 = "0"
            else s1 = "0"
        }
        if (!s1 && !s2) {
            onScoreChange?.(matchId, "")
        } else {
            onScoreChange?.(matchId, `${s1}-${s2}`)
        }
    }

    const isP1Abs = score2 === "ABS"
    const isP2Abs = score1 === "ABS"

    return (
        <div className="flex items-center gap-1">
            <select
                aria-label="Score joueur 1"
                value={isP1Abs ? "" : score1}
                onChange={(e) => handleScorePartChange(1, e.target.value)}
                disabled={isP1Abs}
                className="h-6 w-12 text-xs text-center border rounded px-0.5 bg-white disabled:opacity-50"
            >
                {SCORE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <select
                aria-label="Score joueur 2"
                value={isP2Abs ? "" : score2}
                onChange={(e) => handleScorePartChange(2, e.target.value)}
                disabled={isP2Abs}
                className="h-6 w-12 text-xs text-center border rounded px-0.5 bg-white disabled:opacity-50"
            >
                {SCORE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    )
}

function ScoreDisplay({ match }: { match: Match }) {
    if (!match.score) return <span className="text-gray-400">-</span>
    if (match.score === "WO") {
        return (
            <span className="inline-flex items-center text-xs px-1.5 py-0 rounded-full border border-amber-300 text-amber-600 font-medium">
                WO
            </span>
        )
    }
    if (match.score.includes("ABS")) {
        return <span className="font-semibold text-blue-600">Abs</span>
    }
    return <span className="font-semibold text-blue-600">{match.score}</span>
}

export function MatchListView({ matches, players, searchQuery = "", editMode, pendingScores, onScoreChange, playerAbsences }: MatchListViewProps) {
    const restrictions = buildRestrictionsMap(players)

    const normalizeStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    const query = normalizeStr(searchQuery.trim())

    const filteredMatches = query
        ? matches.filter(m => {
            const p1 = m.player1 ? normalizeStr(`${m.player1.first_name} ${m.player1.last_name}`) : ""
            const p2 = m.player2 ? normalizeStr(`${m.player2.first_name} ${m.player2.last_name}`) : ""
            return p1.includes(query) || p2.includes(query)
        })
        : matches

    // Group matches by date, then by box (group_name)
    const matchesByDate = new Map<string, Match[]>()
    for (const match of filteredMatches) {
        const date = match.match_date
        if (!matchesByDate.has(date)) matchesByDate.set(date, [])
        matchesByDate.get(date)!.push(match)
    }
    const sortedDates = Array.from(matchesByDate.keys()).sort()

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 min-h-0" type="auto">
                <div className="space-y-6">
                    {sortedDates.map(date => {
                        const dayMatches = matchesByDate.get(date) || []

                        // Group by box (group_name)
                        const byBox = new Map<string, Match[]>()
                        for (const m of dayMatches) {
                            const boxName = m.group?.group_name || "Sans groupe"
                            if (!byBox.has(boxName)) byBox.set(boxName, [])
                            byBox.get(boxName)!.push(m)
                        }
                        const sortedBoxes = Array.from(byBox.keys()).sort()

                        return (
                            <div key={date}>
                                <div className="space-y-4">
                                    {sortedBoxes.map(boxName => {
                                        const boxMatches = byBox.get(boxName)!
                                            .sort((a, b) => (a.match_time || "").localeCompare(b.match_time || ""))

                                        return (
                                            <div key={boxName} className="overflow-x-auto border border-gray-200 rounded-xl">
                                                <Table className="table-fixed w-full">
                                                    <colgroup><col className="w-[8%]" /><col className="w-[7%]" /><col className="w-[18%]" /><col className="w-[9%]" /><col className="w-[4%]" /><col className="w-[18%]" /><col className="w-[9%]" /><col className="w-[7%]" /><col className="w-[10%]" /><col className="w-[10%]" /></colgroup>
                                                    <TableHeader>
                                                        <TableRow className="border-b border-gray-200 bg-gray-100 font-bold text-xs">
                                                            <TableHead className="font-bold text-center">Date</TableHead>
                                                            <TableHead className="font-bold text-center">Box</TableHead>
                                                            <TableHead className="font-bold">Joueur A</TableHead>
                                                            <TableHead className="font-bold text-center">Restr.</TableHead>
                                                            <TableHead className="font-bold text-center">vs</TableHead>
                                                            <TableHead className="font-bold">Joueur B</TableHead>
                                                            <TableHead className="font-bold text-center">Restr.</TableHead>
                                                            <TableHead className="font-bold text-center">Heure</TableHead>
                                                            <TableHead className="font-bold text-center">Terrain</TableHead>
                                                            <TableHead className="font-bold text-center">Score</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {boxMatches.map(match => {
                                                            const isP1Winner = match.winner_id === match.player1_id
                                                            const isP2Winner = match.winner_id === match.player2_id
                                                            const p1Absent = !match.score && !!playerAbsences?.get(match.player1_id)?.includes(match.match_date)
                                                            const p2Absent = !match.score && !!playerAbsences?.get(match.player2_id)?.includes(match.match_date)

                                                            return (
                                                                <TableRow key={match.id} className={`border-b border-gray-200 last:border-b-0 ${p1Absent || p2Absent ? "bg-amber-50" : ""}`}>
                                                                    <TableCell className="text-center text-sm">
                                                                        {formatDateLabel(date)}
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-sm font-medium">
                                                                        {boxName}
                                                                    </TableCell>
                                                                    <TableCell className={isP1Winner ? "font-bold text-green-600" : ""}>
                                                                        <span className="flex items-center gap-1.5">
                                                                            {formatPlayerName(match.player1)}
                                                                            {p1Absent && <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1 rounded">Abs</span>}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-xs text-gray-500">
                                                                        <RestrictionDisplay restrictions={restrictions} playerId={match.player1_id} />
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-gray-400">vs</TableCell>
                                                                    <TableCell className={isP2Winner ? "font-bold text-green-600" : ""}>
                                                                        <span className="flex items-center gap-1.5">
                                                                            {formatPlayerName(match.player2)}
                                                                            {p2Absent && <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1 rounded">Abs</span>}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-xs text-gray-500">
                                                                        <RestrictionDisplay restrictions={restrictions} playerId={match.player2_id} />
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        {formatTime(match.match_time)}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        {match.court_number || "-"}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        {editMode ? (
                                                                            <ScoreEditor
                                                                                matchId={match.id}
                                                                                scoreValue={pendingScores?.get(match.id)}
                                                                                onScoreChange={onScoreChange}
                                                                            />
                                                                        ) : (
                                                                            <ScoreDisplay match={match} />
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}

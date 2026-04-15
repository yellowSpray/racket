import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Group } from "@/types/draw";
import type { Match } from "@/types/match";
import type { ScoringRules } from "@/types/settings";
import { useMemo, useState } from "react";
import { calculateGroupStandings, getPointsForScore } from "@/lib/rankingEngine";

interface DrawTableProps {
    group: Group
    matches?: Match[]
    scoringRules?: ScoringRules
    displayMode?: "score" | "points"
}

const DEFAULT_SCORING: ScoringRules = {
    id: "",
    club_id: "",
    score_points: [
        { score: "3-0", winner_points: 5, loser_points: 0 },
        { score: "3-1", winner_points: 4, loser_points: 1 },
        { score: "3-2", winner_points: 3, loser_points: 2 },
        { score: "ABS", winner_points: 3, loser_points: -1 },
    ],
}

export function DrawTable({ group, matches = [], scoringRules, displayMode = "score" }: DrawTableProps) {

    const players = useMemo(() => group.players || [], [group.players])
    const maxPlayers = group.max_players || 6
    const [hoveredMatch, setHoveredMatch] = useState<{row: number, col: number} | null>(null)

    const rules = scoringRules ?? DEFAULT_SCORING

    // Calculer les standings
    const standings = useMemo(() => {
        if (players.length === 0) return null
        const playerData = players.map(p => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
        }))
        return calculateGroupStandings(matches, group.id, group.group_name, playerData, rules)
    }, [matches, group.id, group.group_name, players, rules])

    // Map playerId → points pour accès rapide
    const pointsMap = useMemo(() => {
        const map = new Map<string, number>()
        if (standings) {
            for (const s of standings.standings) {
                map.set(s.playerId, s.points)
            }
        }
        return map
    }, [standings])

    const findMatch = (id1: string, id2: string): Match | undefined =>
        matches.find(m =>
            (m.player1_id === id1 && m.player2_id === id2) ||
            (m.player1_id === id2 && m.player2_id === id1)
        )

    const MONTHS = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil', 'août', 'sept', 'oct.', 'nov.', 'déc.']

    const formatDate = (dateStr: string) => {
        const [, month, day] = dateStr.split('-')
        return `${day}-${MONTHS[parseInt(month, 10) - 1]}`
    }

    const formatTime = (timeStr: string) => {
        const match = timeStr.match(/(\d{2}:\d{2})/)
        return match ? match[1] : timeStr
    }

    const displaySlots = Math.max(maxPlayers, players.length)
    const slots = Array.from({ length: displaySlots }, (_, index) => {
        return players[index] || null
    })

    const getPlayerLetter = (index: number) => {
        return String.fromCharCode(65 + index)
    }

    /**
     * Détermine si le joueur de la ligne (row) est le gagnant du match
     * dans la perspective de la cellule (row vs col).
     */
    const isRowPlayerWinner = (match: Match, rowPlayerId: string): boolean => {
        return match.winner_id === rowPlayerId
    }

    /**
     * Affiche le score du point de vue du joueur de la ligne.
     * Si le joueur est player1, le score reste tel quel (ex: "3-1").
     * Si le joueur est player2, on inverse (ex: "1-3").
     */
    const orientedScore = (match: Match, rowPlayerId: string): string => {
        const score = match.score
        if (!score) return ""
        if (score === "WO" || score === "ABS") return score
        const parts = score.split("-")
        if (parts.length !== 2) return score
        if (match.player1_id === rowPlayerId) return score
        return `${parts[1]}-${parts[0]}`
    }

    return (
        <div className="rounded-lg overflow-hidden h-full border border-foreground" data-draw-table>
            <Table className="w-full h-full border-collapse">
                <TableHeader>
                    <TableRow>
                        <TableHead className="bg-blue-200 font-bold min-w-24 text-center border-r border-b border-foreground">
                            {group.group_name}
                        </TableHead>

                        {slots.map((slot, index) => (
                            <TableHead
                                key={index}
                                className={`text-center font-bold text-xs min-w-12 ${!slot ? 'bg-gray-200': 'bg-yellow-100'} border-r border-b border-foreground`}
                            >
                                {getPlayerLetter(index)}
                            </TableHead>
                        ))}

                        <TableHead className="bg-green-200 text-center font-bold min-w-12 border-b border-foreground">Total</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {slots.map((player, rowIndex) => (
                        <TableRow key={rowIndex} className="group hover:bg-transparent">
                            <TableCell className={`font-medium ${!player ? 'bg-gray-200' : 'bg-yellow-100'} border-r border-b border-foreground group-last:border-b-0`}>
                                {player ? (
                                    <div className="flex items-center px-1 py-0.5">
                                        <span className="font-bold text-xs shrink-0 w-4">{getPlayerLetter(rowIndex)}</span>
                                        <div className="flex-1 text-center min-w-0">
                                            <p className="text-xs truncate">{player.first_name} {player.last_name}</p>
                                            <p className="text-[10px] text-foreground truncate">{player.phone}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center px-1 py-0.5">
                                        <span className="font-bold text-xs shrink-0 w-4">{getPlayerLetter(rowIndex)}</span>
                                        <div className="flex-1 text-center min-w-0">
                                            <p className="text-xs truncate invisible">placeholder</p>
                                            <p className="text-[10px] truncate invisible">placeholder</p>
                                        </div>
                                    </div>
                                )}
                            </TableCell>

                            {slots.map((opponent, colIndex) => {
                                const isHovered = hoveredMatch && (
                                    (hoveredMatch.row === rowIndex && hoveredMatch.col === colIndex) ||
                                    (hoveredMatch.row === colIndex && hoveredMatch.col === rowIndex)
                                )

                                if (rowIndex === colIndex) {
                                    return (
                                        <TableCell
                                            key={colIndex}
                                            className="bg-gray-400 p-2 border-r border-b border-foreground group-last:border-b-0"
                                        >
                                            <div className="invisible text-[10px]">
                                                <div>-</div>
                                                <div className="pb-1 mb-1">-</div>
                                                <div>-</div>
                                            </div>
                                        </TableCell>
                                    )
                                }

                                if (!player || !opponent) {
                                    return (
                                        <TableCell
                                            key={colIndex}
                                            className="bg-gray-200 p-2 border-r border-b border-foreground group-last:border-b-0"
                                        >
                                            <div className="invisible text-[10px]">
                                                <div>-</div>
                                                <div className="pb-1 mb-1">-</div>
                                                <div>-</div>
                                            </div>
                                        </TableCell>
                                    )
                                }

                                const match = findMatch(player.id, opponent.id)
                                const isWinner = match?.winner_id ? isRowPlayerWinner(match, player.id) : false
                                const isAbsence = !!match?.score?.includes("ABS")
                                const isRowPlayerAbsent = isAbsence && !isWinner

                                return (
                                    <TableCell
                                        key={colIndex}
                                        className={`text-center text-xs p-2 transition-colors cursor-pointer border-r border-b border-foreground group-last:border-b-0
                                                ${isAbsence
                                                    ? (isHovered ? 'bg-amber-100' : 'bg-amber-50')
                                                    : (isHovered ? 'bg-gray-200' : '')}
                                            `}
                                        onMouseEnter={() => setHoveredMatch({row: rowIndex, col: colIndex})}
                                        onMouseLeave={() => setHoveredMatch(null)}
                                    >
                                        {match ? (
                                            match.score ? (
                                                displayMode === "points" ? (
                                                    (() => {
                                                        const pts = getPointsForScore(match.score, rules.score_points)
                                                        if (!pts) return <div className="text-gray-300">-</div>
                                                        const playerPts = isWinner ? pts.winnerPts : pts.loserPts
                                                        return <div className={`font-bold ${isAbsence ? 'text-amber-600' : ''}`}>{playerPts}</div>
                                                    })()
                                                ) : (
                                                    <div className={`font-bold ${isAbsence ? 'text-amber-600' : ''}`}>
                                                        {isRowPlayerAbsent ? "Abs" : isAbsence ? "-" : orientedScore(match, player.id)}
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className="text-foreground text-[10px]">{formatDate(match.match_date)}</div>
                                                    <div className="font-bold text-[10px]">{formatTime(match.match_time)}</div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center gap-0.5 text-gray-300 text-[10px]">
                                                <div>-</div>
                                                <div>--:--</div>
                                            </div>
                                        )}
                                    </TableCell>
                                )
                            })}

                            {/* Cellule Total — points calculés */}
                            <TableCell className="bg-green-100 text-center font-bold border-b border-foreground group-last:border-b-0">
                                {player ? (pointsMap.get(player.id) ?? 0) : "-"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

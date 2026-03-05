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

    const players = group.players || []
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

    const formatDate = (dateStr: string) => {
        const [, month, day] = dateStr.split('-')
        return `${day}/${month}`
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

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
                <TableHeader>
                    <TableRow>
                        <TableHead className="bg-blue-200 font-bold text-center">
                            {group.group_name}
                        </TableHead>

                        {slots.map((slot, index) => (
                            <TableHead
                                key={index}
                                className={`text-center font-bold text-xs w-12 ${!slot ? 'bg-gray-200': 'bg-yellow-100'}`}
                            >
                                {getPlayerLetter(index)}
                            </TableHead>
                        ))}

                        <TableHead className="bg-green-200 text-center font-bold w-12">Total</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {slots.map((player, rowIndex) => (
                        <TableRow key={rowIndex} className="hover:bg-transparent">
                            <TableCell className={`font-medium ${!player ? 'bg-gray-200' : 'bg-yellow-100'}`}>
                                {player ? (
                                    <div className="flex items-center px-1 py-0.5">
                                        <span className="font-bold text-xs shrink-0 w-4">{getPlayerLetter(rowIndex)}</span>
                                        <div className="flex-1 text-center min-w-0">
                                            <p className="text-xs truncate">{player.first_name} {player.last_name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{player.phone}</p>
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
                                            className="bg-gray-400 p-2"
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
                                            className="bg-gray-200 p-2"
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
                                        className={`text-center text-xs p-2 border-x border-gray-200 transition-colors cursor-pointer
                                                ${isHovered ? 'bg-gray-200' : ''}
                                                ${isAbsence ? 'bg-amber-50' : ''}
                                            `}
                                        onMouseEnter={() => setHoveredMatch({row: rowIndex, col: colIndex})}
                                        onMouseLeave={() => setHoveredMatch(null)}
                                    >
                                        {match ? (
                                            <div>
                                                <div className="text-gray-500 text-[10px]">{formatDate(match.match_date)}</div>
                                                <div className="font-medium text-[10px] pb-1 mb-1 border-b border-gray-200">{formatTime(match.match_time)}</div>
                                                {match.score ? (
                                                    displayMode === "points" ? (
                                                        (() => {
                                                            const pts = getPointsForScore(match.score, rules.score_points)
                                                            if (!pts) return <div className="invisible">-</div>
                                                            const playerPts = isWinner ? pts.winnerPts : pts.loserPts
                                                            return (
                                                                <div className={`font-bold ${isAbsence ? 'text-amber-600' : ''}`}>
                                                                    {playerPts}
                                                                </div>
                                                            )
                                                        })()
                                                    ) : (
                                                        <div className={`font-bold ${isAbsence ? 'text-amber-600' : ''}`}>
                                                            {isRowPlayerAbsent ? "Abs" : isAbsence ? "-" : match.score}
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="invisible">-</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-gray-400">
                                                <div>-</div>
                                                <div className="pb-1 mb-1 border-b border-gray-200">--:--</div>
                                                <div className="invisible">-</div>
                                            </div>
                                        )}
                                    </TableCell>
                                )
                            })}

                            {/* Cellule Total — points calculés */}
                            <TableCell className="bg-green-100 text-center font-bold">
                                {player ? (pointsMap.get(player.id) ?? 0) : "-"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

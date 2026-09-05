import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Group, GroupPlayer } from "@/types/draw";
import type { Match } from "@/types/match";
import { DEFAULT_SCORE_POINTS, type ScoringSource } from "@/lib/effectiveRules";
import { useMemo, useRef, useState } from "react";
import { calculateGroupStandings, getPointsForScore } from "@/lib/rankingEngine";
import type { PlayerMovement } from "@/lib/playerMovement";
import { PlayerMovementBadge } from "./PlayerMovementBadge";
import { useFitToWidth } from "@/hooks/useFitToWidth";

interface DrawTableProps {
    group: Group
    matches?: Match[]
    /** Bareme deja resolu par l'appelant, via useEffectiveRules. */
    scoringRules?: ScoringSource
    displayMode?: "score" | "points"
    playerAbsences?: Map<string, string[]>
    /**
     * Parcours de chaque joueur depuis la série précédente, indexé par id de joueur.
     * Omis hors configuration de série : la table reste alors strictement inchangée.
     */
    playerMovements?: Map<string, PlayerMovement>
    /**
     * Rend les cases de match cliquables (saisie du score côté admin).
     * Omis ailleurs, notamment sur les pages joueur, la table reste en lecture seule.
     */
    onSelectMatch?: (match: Match, rowPlayer: GroupPlayer, opponent: GroupPlayer) => void
    /**
     * Rend le nom des joueurs actionnable, pour ouvrir leur fiche.
     * Omis ailleurs, le nom reste du texte simple : pas de rôle bouton trompeur
     * sur les pages joueur.
     */
    onSelectPlayer?: (player: GroupPlayer) => void
}

// Dernier recours si l'appelant n'a pas encore resolu de bareme.
const DEFAULT_SCORING: ScoringSource = { score_points: [...DEFAULT_SCORE_POINTS] }

export function DrawTable({ group, matches = [], scoringRules, displayMode = "score", playerAbsences, playerMovements, onSelectMatch, onSelectPlayer }: DrawTableProps) {

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

    /*
     * Meme date, en chiffres. Une box de six joueurs fait huit colonnes : sous
     * 640 pixels, « 05-mars » est le libelle le plus large de la grille et il
     * suffit a la faire deborder. Les deux versions sont rendues, le CSS
     * choisit : pas de mesure de largeur en JavaScript, pas de premier rendu
     * dans le mauvais format.
     */
    const formatDateShort = (dateStr: string) => {
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

    /*
     * Sous 640 pixels la colonne des noms est bornee : tronquer « Renaud
     * Vandenplas » y coupait le nom, la seule partie qui distingue deux
     * joueurs d'une box. L'initiale du prenom suffit et rend une quarantaine
     * de pixels a la grille. Sans nom de famille, abreger ne designerait plus
     * personne : on garde alors le prenom entier.
     *
     * Les deux libelles sont rendus, le CSS choisit lequel s'affiche.
     */
    const shortName = (p: GroupPlayer) => {
        const first = (p.first_name ?? "").trim()
        const last = (p.last_name ?? "").trim()
        if (!last) return first
        if (!first) return last
        return `${first.charAt(0).toUpperCase()}. ${last}`
    }

    const PlayerName = ({ player }: { player: GroupPlayer }) => (
        <>
            <span className="sm:hidden">{shortName(player)}</span>
            <span className="hidden sm:inline">{`${player.first_name} ${player.last_name}`.trim()}</span>
        </>
    )

    /*
     * Quand meme les colonnes au plus court ne suffisent pas, on reduit
     * l'affichage au lieu de faire apparaitre une barre : c'est le
     * comportement qu'avaient les anciens tableaux publies en image.
     */
    const cadre = useRef<HTMLDivElement>(null)
    useFitToWidth(cadre, `${slots.length}:${matches.length}`, "table")

    /*
     * Le cadre defile horizontalement au lieu de rogner : une box de six
     * joueurs depasse la largeur d'un telephone, et overflow-hidden coupait
     * les dernieres colonnes sans que rien ne l'indique.
     */
    return (
        <div ref={cadre} className="rounded-lg overflow-x-auto h-full border border-foreground" data-draw-table>
            <Table className="w-full h-full border-collapse">
                <TableHeader>
                    <TableRow>
                        <TableHead className="bg-blue-200 font-bold min-w-20 sm:min-w-24 text-center border-r border-b border-foreground">
                            {group.group_name}
                        </TableHead>

                        {slots.map((slot, index) => (
                            <TableHead
                                key={index}
                                className={`text-center font-bold text-xs min-w-9 sm:min-w-12 ${!slot ? 'bg-gray-200': 'bg-yellow-100'} border-r border-b border-foreground`}
                            >
                                {getPlayerLetter(index)}
                            </TableHead>
                        ))}

                        <TableHead className="bg-green-200 text-center font-bold min-w-9 sm:min-w-12 border-b border-foreground">
                            <span className="sm:hidden">Pts</span>
                            <span className="hidden sm:inline">Total</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {slots.map((player, rowIndex) => (
                        <TableRow key={rowIndex} className="group hover:bg-transparent">
                            <TableCell className={`font-medium ${!player ? 'bg-gray-200' : 'bg-yellow-100'} border-r border-b border-foreground group-last:border-b-0`}>
                                {player ? (
                                    <div className="flex items-center px-1 py-0.5 w-[5.5rem] sm:w-auto">
                                        <span className="font-bold text-xs shrink-0 w-4">{getPlayerLetter(rowIndex)}</span>
                                        <div className="flex-1 text-center min-w-0">
                                            <p className="text-xs truncate font-bold flex items-center justify-center gap-1">
                                                {onSelectPlayer ? (
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => onSelectPlayer(player)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault()
                                                                onSelectPlayer(player)
                                                            }
                                                        }}
                                                        className="truncate cursor-pointer hover:underline"
                                                    >
                                                        <PlayerName player={player} />
                                                    </span>
                                                ) : (
                                                    <span className="truncate"><PlayerName player={player} /></span>
                                                )}
                                                {playerMovements?.get(player.id) && (
                                                    <PlayerMovementBadge movement={playerMovements.get(player.id)!} />
                                                )}
                                            </p>
                                            <p className="text-[10px] text-foreground truncate">{player.phone}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center px-1 py-0.5 w-[5.5rem] sm:w-auto">
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
                                            className="bg-gray-400 p-1 sm:p-2 border-r border-b border-foreground group-last:border-b-0"
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
                                            className="bg-gray-200 p-1 sm:p-2 border-r border-b border-foreground group-last:border-b-0"
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

                                const selectable = !!onSelectMatch && !!match
                                const openMatch = () => {
                                    if (match && onSelectMatch) onSelectMatch(match, player, opponent)
                                }

                                return (
                                    <TableCell
                                        key={colIndex}
                                        className={`text-center text-xs p-1 sm:p-2 transition-colors cursor-pointer border-r border-b border-foreground group-last:border-b-0
                                                ${isAbsence
                                                    ? (isHovered ? 'bg-amber-100' : 'bg-amber-50')
                                                    : (isHovered ? 'bg-gray-200' : '')}
                                            `}
                                        onMouseEnter={() => setHoveredMatch({row: rowIndex, col: colIndex})}
                                        onMouseLeave={() => setHoveredMatch(null)}
                                        onClick={selectable ? openMatch : undefined}
                                        onKeyDown={selectable ? (e) => {
                                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMatch() }
                                        } : undefined}
                                        role={selectable ? "button" : undefined}
                                        tabIndex={selectable ? 0 : undefined}
                                        aria-label={selectable
                                            ? `Saisir le score : ${player.first_name} ${player.last_name} contre ${opponent.first_name} ${opponent.last_name}`
                                            : undefined}
                                    >
                                        {(() => {
                                            if (!match) return (
                                                <div className="flex flex-col items-center gap-0.5 text-gray-300 text-[10px]">
                                                    <div>-</div>
                                                    <div>--:--</div>
                                                </div>
                                            )
                                            const rowAbsent = !match.score && !!playerAbsences?.get(player.id)?.includes(match.match_date)
                                            const oppAbsent = !match.score && !!playerAbsences?.get(opponent.id)?.includes(match.match_date)
                                            if (rowAbsent || oppAbsent) return (
                                                <div className="font-bold text-amber-600 text-xs">
                                                    {rowAbsent ? "Abs" : "-"}
                                                </div>
                                            )
                                            if (match.score) return displayMode === "points" ? (
                                                (() => {
                                                    const pts = getPointsForScore(match.score!, rules.score_points)
                                                    if (!pts) return <div className="text-gray-300">-</div>
                                                    const playerPts = isWinner ? pts.winnerPts : pts.loserPts
                                                    return <div className={`font-bold ${isAbsence ? 'text-amber-600' : ''}`}>{playerPts}</div>
                                                })()
                                            ) : (
                                                <div className={`font-bold ${isAbsence ? 'text-amber-600' : ''}`}>
                                                    {isRowPlayerAbsent ? "Abs" : isAbsence ? "-" : orientedScore(match, player.id)}
                                                </div>
                                            )
                                            return (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className="text-foreground text-[10px]">
                                                        <span className="sm:hidden">{formatDateShort(match.match_date)}</span>
                                                        <span className="hidden sm:inline">{formatDate(match.match_date)}</span>
                                                    </div>
                                                    <div className="font-bold text-[10px]">{formatTime(match.match_time)}</div>
                                                </div>
                                            )
                                        })()}
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

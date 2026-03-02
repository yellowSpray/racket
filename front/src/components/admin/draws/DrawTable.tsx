import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Group } from "@/types/draw";
import { useState } from "react";

interface DrawTableProps {
    group: Group
}

export function DrawTable({ group }: DrawTableProps) {

    const players = group.players || []
    const maxPlayers = group.max_players || 6
    const [hoveredMatch, setHoveredMatch] = useState<{row: number, col: number} | null>(null)

    const displaySlots = Math.max(maxPlayers, players.length)
    const slots = Array.from({ length: displaySlots }, (_, index) => {
        return players[index] || null 
    })

    // generer les lettres A,B,C ...
    const getPlayerLetter = (index: number) => {
        return String.fromCharCode(65 + index)
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
                <TableHeader>
                    <TableRow>
                        {/* Titre du tableau */}
                        <TableHead className="bg-blue-200 font-bold text-center">
                            {group.group_name}
                        </TableHead>

                        {/* Colonnes des joueurs */}
                        {slots.map((slot, index) => (
                            <TableHead
                                key={index}
                                className={`text-center font-bold text-xs w-12 ${!slot ? 'bg-gray-200': 'bg-yellow-100'}`}
                            >
                                {getPlayerLetter(index)}
                            </TableHead>
                        ))}

                        {/* Colonne total des points */}
                        <TableHead className="bg-green-200 text-center font-bold w-12">Total</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {slots.map((player, rowIndex) => (
                        <TableRow key={rowIndex} className="hover:bg-transparent">
                            {/* Cellule joueur ( lettre + nom + tel) */}
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
                                    <div className="flex items-center px-1 py-0.5 min-h-[2.25rem]">
                                        <span className="font-bold text-xs">{getPlayerLetter(rowIndex)}</span>
                                    </div>
                                )}
                            </TableCell>

                            {/* Cellules des matchs */}
                            {slots.map((opponent, colIndex) => {
                                // verifier si la cellule est en hover
                                const isHovered = hoveredMatch && (
                                    (hoveredMatch.row === rowIndex && hoveredMatch.col === colIndex) ||
                                    (hoveredMatch.row === colIndex && hoveredMatch.col === rowIndex)
                                )

                                // case diagonale (grisée)
                                if (rowIndex === colIndex) {
                                    return (
                                        <TableCell 
                                            key={colIndex} 
                                            className="bg-gray-400"
                                        />
                                    )
                                }

                                // case vide (ni joueur en ligne ni en colonne)
                                if (!player || !opponent) {
                                    return (
                                        <TableCell 
                                            key={colIndex} 
                                            className="bg-gray-200"
                                        />
                                    )
                                }

                                //TODO: case de match (afficher date + heure depuis table matches)
                                return (
                                    <TableCell 
                                        key={colIndex} 
                                        className={`text-center text-xs p-2 border-x border-gray-200 transition-colors cursor-pointer 
                                                ${isHovered ? 'bg-gray-200' : ''}
                                            `}
                                        onMouseEnter={() => setHoveredMatch({row: rowIndex, col: colIndex})}
                                        onMouseLeave={() => setHoveredMatch(null)}
                                    >
                                        {/* TODO: Récupérer depuis matches table */}
                                        <div className="text-gray-400">
                                            <div>-</div>
                                            <div>--:--</div>
                                        </div>
                                    </TableCell>
                                )
                            })}

                            {/* Cellule Total */}
                            <TableCell className="bg-green-100 text-center font-bold">
                                {player ? 0 : "-"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
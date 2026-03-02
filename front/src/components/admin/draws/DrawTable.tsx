import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Group } from "@/types/draw";
import { useState } from "react";

interface DrawTableProps {
    group: Group
    maxPlayers?: number
}

export function DrawTable({ group, maxPlayers = 6 }: DrawTableProps) {

    const players = group.players || []
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
            <Table>
                <TableHeader>
                    <TableRow>
                        {/* Titre du tableau */}
                        <TableHead className="bg-blue-200 font-bold text-center w-32">
                            {group.group_name}
                        </TableHead>

                        {/* Colonnes des joueurs */}
                        {slots.map((slot, index) => (
                            <TableHead
                                key={index}
                                className={`w-20 text-center font-bold ${!slot ? 'bg-gray-200': 'bg-yellow-100'}`}
                            >
                                {getPlayerLetter(index)}
                            </TableHead>
                        ))}

                        {/* Colonne total des points */}
                        <TableHead className="bg-green-200 text-center font-bold">Total</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {slots.map((player, rowIndex) => (
                        <TableRow key={rowIndex} className="hover:bg-transparent">
                            {/* Cellule joueur ( lettre + nom + tel) */}
                            <TableCell className={`font-medium w-48 ${!player ? 'bg-gray-200' : 'bg-yellow-100'}`}>
                                {player ? (
                                    <div className="grid grid-cols-6 m-4 w-40">
                                        <span className="font-bold col-span-1 flex flex-col justify-center">{getPlayerLetter(rowIndex)}</span>
                                        <div className="text-center col-span-5">
                                            <p className="text-sm">{player.first_name} {player.last_name}</p>
                                            <p className="text-xs text-gray-500">{player.phone}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-6 m-4 w-40">
                                        <span className="font-bold">{getPlayerLetter(rowIndex)}</span>
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
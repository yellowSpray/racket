import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Group } from "@/types/draw";

interface DrawTableProps {
    group: Group
}

export function DrawTable({ group }: DrawTableProps) {

    const players = group.players || []

    const slots = Array.from({ length: 6 }, (_, index) => {
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
                        {players.map((_, index) => (
                            <TableHead
                                key={index}
                                className="bg-yellow-100 text-center font-bold"
                            >
                                {getPlayerLetter(index)}
                            </TableHead>
                        ))}

                        {/* Colonne total des points */}
                        <TableHead className="bg-green-200 text-center font-bold">Total</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {players.map((player, rowIndex) => (
                        <TableRow key={player.id}>
                            {/* Cellule joueur ( lettre + nom + tel) */}
                            <TableCell className="bg-yellow-100 font-medium">
                                {player ? (
                                    <div className="grid grid-cols-6 m-4 w-40">
                                        <span className="font-bold col-span-1 flex flex-col justify-center">{getPlayerLetter(rowIndex)}</span>
                                        <div className="text-center col-span-5">
                                            <p className="text-sm">{player.first_name} {player.last_name}</p>
                                            <p className="text-xs text-gray-500">{player.phone}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="font-bold">{getPlayerLetter(rowIndex)}</span>
                                        <span className="text-sm text-gray-400">(vide)</span>
                                    </div>
                                )}
                            </TableCell>

                            {/* Cellules des matchs */}
                            {slots.map((opponent, colIndex) => {
                                // Case diagonale (grisée)
                                if (rowIndex === colIndex) {
                                return (
                                    <TableCell 
                                        key={colIndex} 
                                        className="bg-gray-300"
                                    />
                                )
                                }

                                // Case vide (ni joueur en ligne ni en colonne)
                                if (!player || !opponent) {
                                return (
                                    <TableCell 
                                        key={colIndex} 
                                        className="bg-gray-100"
                                    />
                                )
                                }

                                //TODO: Case de match (afficher date + heure depuis table matches)
                                return (
                                <TableCell 
                                    key={colIndex} 
                                    className="text-center text-xs p-2"
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
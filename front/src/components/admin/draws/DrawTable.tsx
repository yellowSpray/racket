import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Group } from "@/hooks/useGroups";

interface DrawTableProps {
    group: Group
}

export function DrawTable({ group }: DrawTableProps) {

    const players = group.players || []

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
                                <div className="flex flex-col">
                                    <span className="font-bold">{getPlayerLetter(rowIndex)}</span>
                                    <span className="text-sm">{player.first_name} {player.last_name}</span>
                                    <span className="text-xs text-gray-500">{player.phone}</span>
                                </div>
                            </TableCell>

                            {/* Cellule des matchs */}
                            {players.map((opponent, colIndex) => {
                                // les bye
                                if(rowIndex === colIndex) {
                                    return (
                                        <TableCell 
                                            key={colIndex}
                                            className="bg-gray-400"
                                        />
                                    )
                                }

                                // case de match
                                //TODO afficher la date + heure depuis la table des matchs
                                return (
                                    <TableCell
                                        key={colIndex}
                                        className="text-center text-xs p-2"
                                    >
                                        {/* TODO recuperer les matchs depuis la table */}
                                        <div className="text-gray-400">
                                            <div>-</div>
                                            <div>--</div>
                                        </div>
                                    </TableCell>
                                )
                            })}

                            {/* Cellule Total */}
                            <TableCell className="bg-green-100 text-center font-bold">
                                0
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
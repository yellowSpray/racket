import type { PlayerMovement } from "@/hooks/usePlayerMovements"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { UserSwitchIcon } from "hugeicons-react"
import { formatRelativeTime } from "@/lib/formatRelativeTime"

interface PlayerMovementsFeedProps {
    movements: PlayerMovement[]
    loading: boolean
}

export function PlayerMovementsFeed({ movements, loading }: PlayerMovementsFeedProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (movements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <UserSwitchIcon size={28} className="mb-3" />
                <p className="text-sm">Aucun mouvement récent</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full max-h-48" type="auto">
            <div className="pr-3">
                <Table>
                    <TableBody>
                        {movements.map((m) => (
                            <TableRow key={`${m.profileId}-${m.updatedAt}`}>
                                <TableCell className="text-sm truncate py-1.5">
                                    {m.firstName} {m.lastName}
                                </TableCell>
                                <TableCell className="py-1.5">
                                    <Badge
                                        variant={m.status === "active" ? "active" : "inactive"}
                                        className="text-[10px] px-1.5 py-0"
                                    >
                                        {m.status === "active" ? "Inscrit" : "Désinscrit"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap py-1.5">
                                    {formatRelativeTime(m.updatedAt)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
    )
}

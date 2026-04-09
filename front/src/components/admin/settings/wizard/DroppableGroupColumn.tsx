import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { UserGroupIcon, UserAdd01Icon } from "hugeicons-react"
import { DraggablePlayerItem } from "./DraggablePlayerItem"
import type { Group, GroupPlayer } from "@/types/draw"

interface DroppableGroupColumnProps {
    group: Group
    isOver: boolean
    previousPlayerIds?: Set<string>
    maxRows?: number
    moveMap?: Map<string, "promotion" | "relegation">
    availableNewPlayers?: GroupPlayer[]
    onAddPlayer?: (playerId: string) => void
}

export function DroppableGroupColumn({ group, isOver, previousPlayerIds, maxRows, moveMap, availableNewPlayers, onAddPlayer }: DroppableGroupColumnProps) {
    const players = group.players || []
    const count = players.length
    const isFull = count >= group.max_players
    const isOverMax = count > group.max_players
    const hasNewPlayers = (availableNewPlayers?.length ?? 0) > 0

    const { setNodeRef } = useDroppable({ id: `group-${group.id}` })

    const playerIds = players.map(p => `player-${p.id}`)

    return (
        <div
            ref={setNodeRef}
            className={`border rounded-lg p-3 transition-colors ${
                isOver ? "border-blue-400 bg-blue-50/50" :
                isOverMax ? "border-orange-400" :
                isFull ? "border-orange-300" :
                ""
            }`}
        >
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{group.group_name}</h4>
                <Badge variant={isOverMax ? "inactive" : "default"}>
                    <UserGroupIcon className="h-3 w-3 mr-1" />
                    {count}/{group.max_players}
                </Badge>
            </div>
            <SortableContext items={playerIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[40px]">
                    {players.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Aucun joueur</p>
                    ) : (
                        players.map(player => (
                            <DraggablePlayerItem
                                key={player.id}
                                id={`player-${player.id}`}
                                player={player}
                                isNew={previousPlayerIds ? !previousPlayerIds.has(player.id) : false}
                                moveType={moveMap?.get(player.id)}
                            />
                        ))
                    )}
                    {maxRows && Array.from({ length: Math.max(0, maxRows - count) }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-8 flex items-center">
                            {hasNewPlayers && onAddPlayer ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="w-full text-sm px-2 py-1.5 rounded border border-dashed border-blue-300 text-blue-400 italic hover:bg-blue-50 transition-colors text-left">
                                        <span className="flex items-center gap-1.5">
                                            <UserAdd01Icon className="h-3.5 w-3.5" />
                                            Ajouter un joueur
                                        </span>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {availableNewPlayers!.map(p => (
                                            <DropdownMenuItem key={p.id} onSelect={() => onAddPlayer(p.id)}>
                                                <span className="flex items-center justify-between w-full gap-4">
                                                    <span>{p.first_name} {p.last_name}</span>
                                                    <span className="text-xs text-muted-foreground">R{p.power_ranking || "-"}</span>
                                                </span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <div className="w-full text-sm px-2 py-1.5 rounded border border-dashed border-gray-200 text-muted-foreground/40 italic">
                                    Place libre
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </SortableContext>
        </div>
    )
}

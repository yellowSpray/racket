import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import { UserGroupIcon } from "hugeicons-react"
import { DraggablePlayerItem } from "./DraggablePlayerItem"
import type { Group } from "@/types/draw"

interface DroppableGroupColumnProps {
    group: Group
    isOver: boolean
    previousPlayerIds?: Set<string>
    maxRows?: number
}

export function DroppableGroupColumn({ group, isOver, previousPlayerIds, maxRows }: DroppableGroupColumnProps) {
    const players = group.players || []
    const count = players.length
    const isFull = count >= group.max_players
    const isOverMax = count > group.max_players

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
                            />
                        ))
                    )}
                    {maxRows && Array.from({ length: Math.max(0, maxRows - count) }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-8 flex items-center">
                            <div className="w-full text-sm px-2 py-1.5 rounded border border-dashed border-gray-200 text-muted-foreground/40 italic">
                                Place libre
                            </div>
                        </div>
                    ))}
                </div>
            </SortableContext>
        </div>
    )
}

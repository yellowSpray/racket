import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { DraggablePlayerItem } from "./DraggablePlayerItem"
import type { Group } from "@/types/draw"

interface DroppableGroupColumnProps {
    group: Group
    isOver: boolean
    previousPlayerIds?: Set<string>
}

export function DroppableGroupColumn({ group, isOver, previousPlayerIds }: DroppableGroupColumnProps) {
    const players = group.players || []
    const count = players.length
    const isFull = count >= group.max_players
    const isOverMax = count > group.max_players

    const { setNodeRef } = useDroppable({ id: `group-${group.id}` })

    const playerIds = players.map(p => `player-${p.id}`)

    return (
        <div
            ref={setNodeRef}
            className={`border rounded-lg p-4 transition-colors ${
                isOver ? "border-blue-400 bg-blue-50/50" :
                isOverMax ? "border-orange-400" :
                isFull ? "border-orange-300" :
                ""
            }`}
        >
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">{group.group_name}</h4>
                <Badge variant={isOverMax ? "inactive" : "default"}>
                    <Users className="h-3 w-3 mr-1" />
                    {count}/{group.max_players}
                </Badge>
            </div>
            <SortableContext items={playerIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5 min-h-[40px]">
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
                </div>
            </SortableContext>
        </div>
    )
}

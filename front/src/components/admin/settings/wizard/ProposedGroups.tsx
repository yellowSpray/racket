import { useState } from "react"
import {
    DndContext,
    DragOverlay,
    closestCenter,
    useSensor,
    useSensors,
    PointerSensor,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from "@dnd-kit/core"
import { movePlayerBetweenGroups } from "@/lib/groupPlayerMove"
import { DroppableGroupColumn } from "./DroppableGroupColumn"
import { DraggablePlayerItem } from "./DraggablePlayerItem"
import type { Group, GroupPlayer } from "@/types/draw"

interface ProposedGroupsProps {
    groups: Group[]
    onGroupsChanged: (groups: Group[]) => void
    previousPlayerIds?: Set<string>
    maxRows?: number
}

export function ProposedGroups({ groups, onGroupsChanged, previousPlayerIds, maxRows }: ProposedGroupsProps) {
    const [activePlayer, setActivePlayer] = useState<GroupPlayer | null>(null)
    const [overGroupId, setOverGroupId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    )

    if (groups.length === 0) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4">
                Aucun groupe propose
            </div>
        )
    }

    const findGroupForPlayer = (playerId: string): string | null => {
        const realId = playerId.replace("player-", "")
        for (const group of groups) {
            if ((group.players || []).some(p => p.id === realId)) {
                return group.id
            }
        }
        return null
    }

    const handleDragStart = (event: DragStartEvent) => {
        const playerId = (event.active.id as string).replace("player-", "")
        for (const group of groups) {
            const player = (group.players || []).find(p => p.id === playerId)
            if (player) {
                setActivePlayer(player)
                break
            }
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const overId = event.over?.id as string | undefined
        if (!overId) {
            setOverGroupId(null)
            return
        }
        if (overId.startsWith("group-")) {
            setOverGroupId(overId.replace("group-", ""))
        } else if (overId.startsWith("player-")) {
            setOverGroupId(findGroupForPlayer(overId))
        } else {
            setOverGroupId(null)
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setActivePlayer(null)
        setOverGroupId(null)

        const { active, over } = event
        if (!over) return

        const activeId = (active.id as string).replace("player-", "")
        const fromGroupId = findGroupForPlayer(active.id as string)
        if (!fromGroupId) return

        let toGroupId: string | null = null
        const overId = over.id as string
        if (overId.startsWith("group-")) {
            toGroupId = overId.replace("group-", "")
        } else if (overId.startsWith("player-")) {
            toGroupId = findGroupForPlayer(overId)
        }

        if (!toGroupId || fromGroupId === toGroupId) return

        const newGroups = movePlayerBetweenGroups(groups, activeId, fromGroupId, toGroupId)
        onGroupsChanged(newGroups)
    }

    return (
        <div className="space-y-3">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="space-y-3">
                    {groups.map(group => (
                        <DroppableGroupColumn
                            key={group.id}
                            group={group}
                            isOver={overGroupId === group.id}
                            previousPlayerIds={previousPlayerIds}
                            maxRows={maxRows}
                        />
                    ))}
                </div>
                <DragOverlay>
                    {activePlayer && (
                        <div className="shadow-lg">
                            <DraggablePlayerItem player={activePlayer} id={`player-${activePlayer.id}`} />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </div>
    )
}

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
import { movePlayerBetweenGroups, movePlayerToPosition } from "@/lib/groupPlayerMove"
import { DroppableGroupColumn } from "./DroppableGroupColumn"
import { DraggablePlayerItem } from "./DraggablePlayerItem"
import type { Group, GroupPlayer } from "@/types/draw"

interface ProposedGroupsProps {
    groups: Group[]
    onGroupsChanged: (groups: Group[]) => void
    previousPlayerIds?: Set<string>
    maxRows?: number
    moveMap?: Map<string, "promotion" | "relegation">
    newPlayers?: GroupPlayer[]
}

export function ProposedGroups({ groups, onGroupsChanged, previousPlayerIds, maxRows, moveMap, newPlayers }: ProposedGroupsProps) {
    const [activePlayer, setActivePlayer] = useState<GroupPlayer | null>(null)
    const [overGroupId, setOverGroupId] = useState<string | null>(null)

    const placedPlayerIds = new Set(groups.flatMap(g => (g.players || []).map(p => p.id)))
    const availableNewPlayers = (newPlayers || []).filter(p => !placedPlayerIds.has(p.id))

    const handleAddPlayer = (playerId: string, groupId: string) => {
        const player = (newPlayers || []).find(p => p.id === playerId)
        if (!player) return
        onGroupsChanged(groups.map(g =>
            g.id === groupId ? { ...g, players: [...(g.players || []), player] } : g
        ))
    }

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

        const overId = over.id as string

        if (overId.startsWith("player-")) {
            // Drop sur un joueur → insertion à sa position exacte
            const overPlayerId = overId.replace("player-", "")
            const toGroupId = findGroupForPlayer(overId)
            if (!toGroupId) return
            const toGroup = groups.find(g => g.id === toGroupId)
            const toIndex = (toGroup?.players || []).findIndex(p => p.id === overPlayerId)
            const newGroups = movePlayerToPosition(groups, activeId, fromGroupId, toGroupId, toIndex === -1 ? 0 : toIndex)
            onGroupsChanged(newGroups)
        } else if (overId.startsWith("group-")) {
            // Drop sur la zone du groupe → ajout en fin de liste
            const toGroupId = overId.replace("group-", "")
            if (fromGroupId === toGroupId) return
            const newGroups = movePlayerBetweenGroups(groups, activeId, fromGroupId, toGroupId)
            onGroupsChanged(newGroups)
        }
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
                            moveMap={moveMap}
                            availableNewPlayers={availableNewPlayers}
                            onAddPlayer={(playerId) => handleAddPlayer(playerId, group.id)}
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

import { useState, useMemo } from "react"
import { useErrorHandler } from "@/hooks/useErrorHandler"
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
import { supabase } from "@/lib/supabaseClient"
import { movePlayerBetweenGroups, validateGroups } from "@/lib/groupPlayerMove"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DroppableGroupColumn } from "./DroppableGroupColumn"
import { DraggablePlayerItem } from "./DraggablePlayerItem"
import { Tick02Icon, Alert02Icon } from "hugeicons-react"
import type { Group, GroupPlayer } from "@/types/draw"

interface GroupDndManagerProps {
    initialGroups: Group[]
    eventId: string
    onFinish: (updatedGroups: Group[]) => void
    onCancel: () => void
}

interface PendingMove {
    playerId: string
    fromGroupId: string
    toGroupId: string
}

export function GroupDndManager({ initialGroups, onFinish, onCancel }: GroupDndManagerProps) {
    const [localGroups, setLocalGroups] = useState<Group[]>(initialGroups)
    const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([])
    const [saving, setSaving] = useState(false)
    const { handleError, clearError } = useErrorHandler()
    const [activePlayer, setActivePlayer] = useState<GroupPlayer | null>(null)
    const [overGroupId, setOverGroupId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    )

    const validation = useMemo(() => validateGroups(localGroups), [localGroups])

    const findGroupForPlayer = (playerId: string): string | null => {
        const realId = playerId.replace("player-", "")
        for (const group of localGroups) {
            if ((group.players || []).some(p => p.id === realId)) {
                return group.id
            }
        }
        return null
    }

    const handleDragStart = (event: DragStartEvent) => {
        const playerId = (event.active.id as string).replace("player-", "")
        for (const group of localGroups) {
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
            const groupId = findGroupForPlayer(overId)
            setOverGroupId(groupId)
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

        const newGroups = movePlayerBetweenGroups(localGroups, activeId, fromGroupId, toGroupId)
        setLocalGroups(newGroups)
        setPendingMoves(prev => [...prev, { playerId: activeId, fromGroupId, toGroupId: toGroupId! }])
    }

    const handleFinish = async () => {
        if (!validation.valid) return

        setSaving(true)
        clearError()

        try {
            // Deduplicate moves: track original → final position per player
            const playerMoves = new Map<string, { originalGroupId: string; currentGroupId: string }>()
            for (const move of pendingMoves) {
                const existing = playerMoves.get(move.playerId)
                if (existing) {
                    existing.currentGroupId = move.toGroupId
                } else {
                    playerMoves.set(move.playerId, {
                        originalGroupId: move.fromGroupId,
                        currentGroupId: move.toGroupId,
                    })
                }
            }

            // Execute only net moves (skip if player ended up back in original group)
            for (const [playerId, { originalGroupId, currentGroupId }] of playerMoves) {
                if (originalGroupId === currentGroupId) continue

                await supabase
                    .from("group_players")
                    .delete()
                    .eq("group_id", originalGroupId)
                    .eq("profile_id", playerId)

                await supabase
                    .from("group_players")
                    .insert({ group_id: currentGroupId, profile_id: playerId })
            }

            onFinish(localGroups)
        } catch (err) {
            handleError(err)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Glissez les joueurs entre les groupes
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
                        Annuler
                    </Button>
                    <Button size="sm" onClick={handleFinish} disabled={!validation.valid || saving}>
                        <Tick02Icon className="mr-2 h-4 w-4" />
                        {saving ? "Sauvegarde..." : "Terminer"}
                    </Button>
                </div>
            </div>

            {!validation.valid && (
                <Alert variant="destructive">
                    <Alert02Icon className="h-4 w-4" />
                    <AlertDescription>
                        {validation.errors.map((e, i) => <span key={i}>{e}<br /></span>)}
                    </AlertDescription>
                </Alert>
            )}


            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {localGroups.map(group => (
                        <DroppableGroupColumn
                            key={group.id}
                            group={group}
                            isOver={overGroupId === group.id}
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

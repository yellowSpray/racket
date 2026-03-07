import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DragDropVerticalIcon, UserAdd01Icon } from "hugeicons-react"
import type { GroupPlayer } from "@/types/draw"

interface DraggablePlayerItemProps {
    player: GroupPlayer
    id: string
    isNew?: boolean
}

export function DraggablePlayerItem({ player, id, isNew }: DraggablePlayerItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const style = {
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between text-sm px-2 py-1.5 rounded-md border cursor-grab ${
                isNew ? "bg-blue-50 border-blue-200" : "bg-white"
            }`}
            {...attributes}
            {...listeners}
        >
            <div className="flex items-center gap-2">
                <DragDropVerticalIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{player.first_name} {player.last_name}</span>
                {isNew && (
                    <UserAdd01Icon className="h-3.5 w-3.5 text-blue-500" />
                )}
            </div>
            <span className="text-xs text-muted-foreground">R{player.power_ranking || "-"}</span>
        </div>
    )
}

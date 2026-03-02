import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import type { GroupPlayer } from "@/types/draw"

interface DraggablePlayerItemProps {
    player: GroupPlayer
    id: string
}

export function DraggablePlayerItem({ player, id }: DraggablePlayerItemProps) {
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
            className="flex items-center justify-between text-sm px-2 py-1.5 rounded-md border bg-white cursor-grab"
            {...attributes}
            {...listeners}
        >
            <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{player.first_name} {player.last_name}</span>
            </div>
            <span className="text-xs text-muted-foreground">R{player.power_ranking || "-"}</span>
        </div>
    )
}

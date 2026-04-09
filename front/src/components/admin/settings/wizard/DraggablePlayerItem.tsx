import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DragDropVerticalIcon, UserAdd01Icon, ChartIncreaseIcon, ChartDecreaseIcon } from "hugeicons-react"
import type { GroupPlayer } from "@/types/draw"

interface DraggablePlayerItemProps {
    player: GroupPlayer
    id: string
    isNew?: boolean
    moveType?: "promotion" | "relegation"
}

export function DraggablePlayerItem({ player, id, isNew, moveType }: DraggablePlayerItemProps) {
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

    const bgClass = isNew
        ? "bg-blue-50 border-blue-200"
        : moveType === "promotion"
        ? "bg-emerald-50 border-emerald-200"
        : moveType === "relegation"
        ? "bg-red-50 border-red-200"
        : "bg-white border-gray-200"

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between text-sm px-2 py-1.5 rounded-md border cursor-grab h-8 ${bgClass}`}
            {...attributes}
            {...listeners}
        >
            <div className="flex items-center gap-2">
                <DragDropVerticalIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{player.first_name} {player.last_name}</span>
                {isNew && <UserAdd01Icon className="h-3.5 w-3.5 text-blue-500" />}
                {!isNew && moveType === "promotion" && <ChartIncreaseIcon className="h-3.5 w-3.5 text-emerald-600" />}
                {!isNew && moveType === "relegation" && <ChartDecreaseIcon className="h-3.5 w-3.5 text-red-500" />}
            </div>
            <span className="text-xs text-muted-foreground">R{player.power_ranking || "-"}</span>
        </div>
    )
}

import { useMemo, useCallback, useState } from "react"
import type { Match } from "@/types/match"
import type { Event } from "@/types/event"
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MatchCell } from "./MatchCell"
import { calculateTimeSlots, validateMatchSlot, type PlayerConstraints } from "@/lib/matchScheduler"
import { intervalToMinutes } from "@/lib/utils"

interface MatchScheduleGridProps {
    matches: Match[]
    event: Event
    editMode?: boolean
    pendingScores?: Map<string, string>
    onScoreChange?: (matchId: string, value: string) => void
    onMatchDrop?: (matchId: string, updates: { match_date: string; match_time: string; court_number: string }) => void
    playerConstraints?: Map<string, PlayerConstraints>
}

function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

/** Encode un slot en ID droppable */
function slotId(date: string, time: string, court: string): string {
    return `slot::${date}::${time}::${court}`
}

/** Decode un ID droppable en {date, time, court} */
function parseSlotId(id: string): { date: string; time: string; court: string } | null {
    const parts = id.split("::")
    if (parts.length !== 4 || parts[0] !== "slot") return null
    return { date: parts[1], time: parts[2], court: parts[3] }
}

function DraggableMatch({
    match,
    editMode,
    scoreValue,
    onScoreChange,
}: {
    match: Match
    editMode?: boolean
    scoreValue?: string
    onScoreChange?: (v: string) => void
}) {
    const canDrag = !match.winner_id && !editMode
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `match-${match.id}`,
        disabled: !canDrag,
        data: { match },
    })

    return (
        <div
            ref={setNodeRef}
            {...(canDrag ? { ...attributes, ...listeners } : {})}
            className={`${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-30' : ''}`}
        >
            <MatchCell
                match={match}
                editMode={editMode}
                scoreValue={scoreValue}
                onScoreChange={onScoreChange}
            />
        </div>
    )
}

function DroppableSlot({ id }: { id: string }) {
    const { setNodeRef, isOver } = useDroppable({ id })

    return (
        <div
            ref={setNodeRef}
            className={`py-2 text-center transition-colors rounded ${
                isOver ? 'bg-green-100 ring-2 ring-green-400' : 'text-gray-300'
            }`}
        >
            {isOver ? <span className="text-green-600 text-xs font-medium">Deposer ici</span> : "—"}
        </div>
    )
}

export function MatchScheduleGrid({
    matches,
    event,
    editMode,
    pendingScores,
    onScoreChange,
    onMatchDrop,
    playerConstraints,
}: MatchScheduleGridProps) {
    const dndEnabled = !!onMatchDrop
    const [activeMatch, setActiveMatch] = useState<Match | null>(null)
    const [dropError, setDropError] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    const timeSlots = useMemo(() => {
        const durationMin = intervalToMinutes(event.estimated_match_duration)
        return calculateTimeSlots(
            event.start_time || "19:00",
            event.end_time || "23:00",
            durationMin
        )
    }, [event.estimated_match_duration, event.start_time, event.end_time])

    const courts = useMemo(() => {
        const courtsSet = new Set<string>()
        matches.forEach(m => {
            if (m.court_number) courtsSet.add(m.court_number)
        })
        const sorted = Array.from(courtsSet).sort()
        if (sorted.length > 0) return sorted
        return Array.from({ length: event.number_of_courts }, (_, i) => `Terrain ${i + 1}`)
    }, [matches, event.number_of_courts])

    const { sortedDates, matchesByDate } = useMemo(() => {
        const byDate = new Map<string, Match[]>()
        for (const match of matches) {
            const date = match.match_date
            if (!byDate.has(date)) byDate.set(date, [])
            byDate.get(date)!.push(match)
        }
        return { sortedDates: Array.from(byDate.keys()).sort(), matchesByDate: byDate }
    }, [matches])

    const findMatch = useCallback((dayMatches: Match[], time: string, court: string): Match | null => {
        return dayMatches.find(m => {
            const matchTime = m.match_time?.match(/(\d{2}:\d{2})/)?.[1]
            return matchTime === time && m.court_number === court
        }) || null
    }, [])

    const handleDragStart = (event: DragStartEvent) => {
        const match = event.active.data.current?.match as Match | undefined
        setActiveMatch(match || null)
    }

    const durationMin = intervalToMinutes(event.estimated_match_duration)

    const handleDragEnd = (dragEvent: DragEndEvent) => {
        const draggedMatch = activeMatch
        setActiveMatch(null)
        setDropError(null)
        const { active, over } = dragEvent
        if (!over || !onMatchDrop) return

        const overId = over.id as string
        const slot = parseSlotId(overId)
        if (!slot) return

        if (playerConstraints && draggedMatch) {
            const p1 = draggedMatch.player1
            const p2 = draggedMatch.player2
            const validation = validateMatchSlot(
                draggedMatch.player1_id,
                draggedMatch.player2_id,
                slot.date,
                slot.time,
                playerConstraints,
                durationMin,
                {
                    player1Name: p1 ? `${p1.first_name} ${p1.last_name}` : draggedMatch.player1_id,
                    player2Name: p2 ? `${p2.first_name} ${p2.last_name}` : draggedMatch.player2_id,
                }
            )
            if (!validation.valid) {
                setDropError(validation.warnings.join(" / "))
                return
            }
        }

        const matchId = (active.id as string).replace("match-", "")
        onMatchDrop(matchId, {
            match_date: slot.date,
            match_time: slot.time,
            court_number: slot.court,
        })
    }

    const gridContent = (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {dropError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-2 text-sm flex items-center justify-between">
                    <span>{dropError}</span>
                    <button onClick={() => setDropError(null)} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
                </div>
            )}
            <ScrollArea className="flex-1 min-h-0" type="auto">
                <div className="space-y-6">
                    {sortedDates.map(date => {
                        const dayMatches = matchesByDate.get(date) || []
                        const label = formatDateLabel(date)

                        return (
                            <div key={date}>
                                <div className="overflow-x-auto border-gray-200 border-1 rounded-xl">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-gray-200">
                                                <TableHead colSpan={courts.length + 1} className="text-center text-[10px] font-semibold uppercase">
                                                    {label}
                                                </TableHead>
                                            </TableRow>
                                            <TableRow className="border-b border-gray-200 bg-gray-100">
                                                <TableHead className="w-12 text-center font-bold text-xs border-r border-gray-200">
                                                    Heure
                                                </TableHead>
                                                {courts.map(court => (
                                                    <TableHead
                                                        key={court}
                                                        className="text-center font-bold min-w-[140px] border-r border-gray-200 last:border-r-0"
                                                    >
                                                        {court}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {timeSlots.map(time => (
                                                <TableRow key={time} className="border-b border-gray-200 last:border-0">
                                                    <TableCell className="text-center font-medium text-xs px-1 py-1 w-12">
                                                        {time}
                                                    </TableCell>
                                                    {courts.map(court => {
                                                        const m = findMatch(dayMatches, time, court)
                                                        return (
                                                            <TableCell
                                                                key={court}
                                                                className="text-center border-l p-1"
                                                            >
                                                                {m ? (
                                                                    dndEnabled ? (
                                                                        <DraggableMatch
                                                                            match={m}
                                                                            editMode={editMode}
                                                                            scoreValue={pendingScores?.get(m.id)}
                                                                            onScoreChange={(v) => onScoreChange?.(m.id, v)}
                                                                        />
                                                                    ) : (
                                                                        <MatchCell
                                                                            match={m}
                                                                            editMode={editMode}
                                                                            scoreValue={pendingScores?.get(m.id)}
                                                                            onScoreChange={(v) => onScoreChange?.(m.id, v)}
                                                                        />
                                                                    )
                                                                ) : (
                                                                    dndEnabled ? (
                                                                        <DroppableSlot id={slotId(date, time, court)} />
                                                                    ) : (
                                                                        <div className="py-2 text-center text-gray-300">-</div>
                                                                    )
                                                                )}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    {dayMatches.length} match{dayMatches.length > 1 ? 's' : ''} programmé{dayMatches.length > 1 ? 's' : ''}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )

    if (!dndEnabled) return gridContent

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {gridContent}
            <DragOverlay>
                {activeMatch && (
                    <div className="bg-white shadow-lg rounded-md border-2 border-green-400 px-3 py-2 opacity-90">
                        <MatchCell match={activeMatch} />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    )
}

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ChartIncreaseIcon, StarIcon, Shield01Icon, ChampionIcon, ArrowUp01Icon, ArrowDown01Icon } from "hugeicons-react"
import type { FC } from "react"
import { usePlayerHistory } from "@/hooks/usePlayerHistory"
import type { EventHistoryEntry } from "@/hooks/usePlayerHistory"

const PREVIEW_HISTORY: EventHistoryEntry[] = [
    { id: "1", event_name: "Série Printemps",   start_date: "2024-03-01", wins: 1, losses: 3, total: 4, anecdote: "Première série"  },
    { id: "2", event_name: "Série Été",          start_date: "2024-06-01", wins: 4, losses: 0, total: 4, anecdote: "Invaincu"         },
    { id: "3", event_name: "Série Automne",      start_date: "2024-09-01", wins: 5, losses: 1, total: 6, anecdote: "Meilleure série"  },
    { id: "4", event_name: "Série Hiver",        start_date: "2024-12-01", wins: 3, losses: 2, total: 5, anecdote: "En progression"   },
    { id: "5", event_name: "Série Printemps 2",  start_date: "2025-03-01", wins: 4, losses: 1, total: 5, anecdote: "Montée"           },
    { id: "6", event_name: "Série Été 2",        start_date: "2025-06-01", wins: 1, losses: 4, total: 5, anecdote: "Descente"         },
]

interface EvolutionCardProps {
    profileId?: string
    preview?: boolean
    className?: string
}


type HugeIcon = FC<{ size?: number; strokeWidth?: number; className?: string }>

function getAnecdoteStyle(anecdote: string): string {
    switch (anecdote) {
        case "Première série":  return "bg-purple-100 text-purple-700"
        case "Invaincu":        return "bg-green-100 text-green-700"
        case "Meilleure série": return "bg-blue-100 text-blue-700"
        case "En progression":  return "bg-indigo-100 text-indigo-700"
        case "Montée":          return "bg-emerald-100 text-emerald-700"
        case "Descente":        return "bg-red-100 text-red-600"
        default:                return "bg-muted text-muted-foreground"
    }
}

function getAnecdoteIcon(anecdote: string): HugeIcon {
    switch (anecdote) {
        case "Première série":  return StarIcon
        case "Invaincu":        return Shield01Icon
        case "Meilleure série": return ChampionIcon
        case "En progression":  return ChartIncreaseIcon
        case "Montée":          return ArrowUp01Icon
        case "Descente":        return ArrowDown01Icon
        default:                return StarIcon
    }
}

function TimelineNode({ entry, index }: { entry: EventHistoryEntry; index: number }) {
    return (
        <div className="flex flex-col items-center w-24 xl:w-28">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="relative z-10 size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 cursor-default bg-gray-300 text-foreground">
                        {index + 1}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-300 border-gray-400">
                    <div className="flex flex-col gap-1 text-xs items-center text-center">
                        <span className="font-medium text-gray-800">
                            {new Date(entry.start_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                        </span>
                        {entry.total > 0 ? (
                            <span className="text-gray-700">
                                <span className="text-green-700 font-semibold">{entry.wins} victoire{entry.wins > 1 ? "s" : ""}</span>
                                {" · "}
                                <span className="text-orange-700 font-semibold">{entry.losses} défaite{entry.losses > 1 ? "s" : ""}</span>
                            </span>
                        ) : (
                            <span className="text-gray-600 italic">Aucun match joué</span>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>

            <div className="mt-2 text-center w-full px-1">
                <p className="text-xs font-medium truncate leading-tight">{entry.event_name}</p>
                {entry.anecdote && (() => {
                    const Icon = getAnecdoteIcon(entry.anecdote)
                    return (
                        <span className={`inline-flex items-center gap-1 mt-1.5 text-[9px] px-2 py-0.5 rounded-full font-medium ${getAnecdoteStyle(entry.anecdote)}`}>
                            <Icon size={9} strokeWidth={2} />
                            {entry.anecdote}
                        </span>
                    )
                })()}
            </div>
        </div>
    )
}

export function EvolutionCard({ profileId, preview = false, className }: EvolutionCardProps) {
    const { history, loading, fetchHistory } = usePlayerHistory()
    const scrollRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [showLeft, setShowLeft] = useState(false)
    const [showRight, setShowRight] = useState(false)

    useEffect(() => {
        if (!preview && profileId) fetchHistory(profileId)
    }, [preview, profileId, fetchHistory])

    const displayHistory = preview ? PREVIEW_HISTORY : history

    const onMouseDown = (e: React.MouseEvent) => {
        const el = scrollRef.current
        if (!el) return
        dragRef.current = { isDragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
        setIsDragging(true)
    }

    const onMouseMove = (e: React.MouseEvent) => {
        const el = scrollRef.current
        if (!el || !dragRef.current.isDragging) return
        e.preventDefault()
        const x = e.pageX - el.offsetLeft
        el.scrollLeft = dragRef.current.scrollLeft - (x - dragRef.current.startX)
    }

    const onDragEnd = () => {
        dragRef.current.isDragging = false
        setIsDragging(false)
    }

    const onTouchStart = (e: React.TouchEvent) => {
        const el = scrollRef.current
        if (!el) return
        dragRef.current = { isDragging: true, startX: e.touches[0].pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
    }

    const onTouchMove = (e: React.TouchEvent) => {
        const el = scrollRef.current
        if (!el || !dragRef.current.isDragging) return
        const x = e.touches[0].pageX - el.offsetLeft
        el.scrollLeft = dragRef.current.scrollLeft - (x - dragRef.current.startX)
    }

    const updateFades = () => {
        const el = scrollRef.current
        if (!el) return
        setShowLeft(el.scrollLeft > 0)
        setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
    }

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        el.scrollLeft = el.scrollWidth
        updateFades()
        el.addEventListener("scroll", updateFades)
        const ro = new ResizeObserver(updateFades)
        ro.observe(el)
        return () => { el.removeEventListener("scroll", updateFades); ro.disconnect() }
    }, [displayHistory])

    return (
        <Card className={`${className} flex flex-col`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <ChartIncreaseIcon size={16} className="text-foreground" />
                    Évolution
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex items-center">
                {loading ? (
                    <p className="text-xs text-muted-foreground">Chargement...</p>
                ) : displayHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full gap-2 text-gray-400">
                        <ChartIncreaseIcon size={28} />
                        <p className="text-xs text-center">Aucune série jouée pour l'instant</p>
                    </div>
                ) : (
                    <div className="relative w-full">
                        {showLeft && (
                            <div className="absolute left-0 top-0 bottom-0 w-10 z-20 pointer-events-none bg-gradient-to-r from-card to-transparent" />
                        )}
                        {showRight && (
                            <div className="absolute right-0 top-0 bottom-0 w-10 z-20 pointer-events-none bg-gradient-to-l from-card to-transparent" />
                        )}
                    <div
                        ref={scrollRef}
                        className={`w-full overflow-x-auto select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                        style={{ scrollbarWidth: "none" }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onDragEnd}
                        onMouseLeave={onDragEnd}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onDragEnd}
                    >
                        <div className="relative flex items-start min-w-max gap-12">
                            {/* Ligne continue */}
                            <div className="absolute top-3 left-12 right-12 h-0.5 bg-muted-foreground/30" />
                            {displayHistory.map((entry, i) => (
                                <TimelineNode
                                    key={entry.id}
                                    entry={entry}
                                    index={i}
                                />
                            ))}
                        </div>
                    </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

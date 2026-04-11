import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import type { CarouselApi } from "@/components/ui/carousel"
import { TaskEdit01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"
import { usePendingScores, type PendingMatch, type PendingDay } from "@/hooks/usePendingScores"

const SCORE_OPTIONS = [
    { value: "", label: "Score…" },
    { value: "3-0", label: "3 – 0" },
    { value: "3-1", label: "3 – 1" },
    { value: "3-2", label: "3 – 2" },
    { value: "0-3", label: "0 – 3" },
    { value: "1-3", label: "1 – 3" },
    { value: "2-3", label: "2 – 3" },
    { value: "ABS-0", label: "Abs P1" },
    { value: "0-ABS", label: "Abs P2" },
]

function formatMatchTime(value: string): string {
    const isoMatch = value.match(/T(\d{2}:\d{2})/)
    if (isoMatch) return isoMatch[1]
    const timeMatch = value.match(/^(\d{2}:\d{2})/)
    if (timeMatch) return timeMatch[1]
    return value.slice(0, 5)
}

function getStatusBadgeVariant(status: PendingMatch["status"]) {
    if (status === "conflict") return "unpaid" as const
    if (status === "waiting_one") return "pending" as const
    return "inactive" as const
}

function getStatusLabel(status: PendingMatch["status"]): string {
    if (status === "conflict") return "Conflit"
    if (status === "waiting_one") return "En attente"
    return "À saisir"
}

interface PendingScoresCardProps {
    eventId: string | null
    className?: string
}

export function PendingScoresCard({ eventId, className }: PendingScoresCardProps) {
    const { days, loading, resolveScore } = usePendingScores(eventId)
    const [slideIndex, setSlideIndex] = useState(0)
    const [api, setApi] = useState<CarouselApi>()
    const [scoreSelections, setScoreSelections] = useState<Map<string, string>>(new Map())

    const onSelect = useCallback(() => {
        if (!api) return
        setSlideIndex(api.selectedScrollSnap())
    }, [api])

    useEffect(() => {
        if (!api) return
        api.on("select", onSelect)
        return () => { api.off("select", onSelect) }
    }, [api, onSelect])

    // Remet l'index à 0 si les données changent et que l'index est hors limites
    useEffect(() => {
        if (days.length > 0 && slideIndex >= days.length) {
            setSlideIndex(0)
            api?.scrollTo(0)
        }
    }, [days.length, slideIndex, api])

    const handleScoreChange = useCallback((matchId: string, value: string) => {
        setScoreSelections(prev => new Map(prev).set(matchId, value))
    }, [])

    const handleValidate = useCallback(async (match: PendingMatch, score: string) => {
        if (!score) return
        const ok = await resolveScore(match.id, score, match.player1_id, match.player2_id)
        if (ok) {
            setScoreSelections(prev => {
                const next = new Map(prev)
                next.delete(match.id)
                return next
            })
        }
    }, [resolveScore])

    const currentDay = days[slideIndex]
    const totalPending = days.reduce((sum, d) => sum + d.matches.length, 0)

    const headerLabel = currentDay?.label ?? "Scores en attente"

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <TaskEdit01Icon size={16} className="text-foreground shrink-0" />
                    <span className="flex-1 truncate">{headerLabel}</span>
                    {totalPending > 0 && (
                        <Badge variant="inactive" className="text-[10px] px-1.5 py-0 shrink-0">
                            {totalPending}
                        </Badge>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            onClick={() => api?.scrollPrev()}
                            disabled={slideIndex === 0 || days.length === 0}
                            className="p-0.5 rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Jour précédent"
                        >
                            <ArrowLeft01Icon size={14} />
                        </button>
                        <button
                            onClick={() => api?.scrollNext()}
                            disabled={slideIndex >= days.length - 1 || days.length === 0}
                            className="p-0.5 rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Jour suivant"
                        >
                            <ArrowRight01Icon size={14} />
                        </button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        <p className="text-sm">Chargement...</p>
                    </div>
                ) : days.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <TaskEdit01Icon size={28} />
                        <p className="text-xs text-center">Tous les scores<br />sont saisis</p>
                    </div>
                ) : (
                    <Carousel setApi={setApi} opts={{ loop: false }} className="h-full">
                        <CarouselContent className="h-full">
                            {days.map((day) => (
                                <CarouselItem key={day.date} className="h-full">
                                    <MatchDaySlide
                                        day={day}
                                        scoreSelections={scoreSelections}
                                        onScoreChange={handleScoreChange}
                                        onValidate={handleValidate}
                                    />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                )}
            </CardContent>
        </Card>
    )
}

interface MatchDaySlideProps {
    day: PendingDay
    scoreSelections: Map<string, string>
    onScoreChange: (matchId: string, value: string) => void
    onValidate: (match: PendingMatch, score: string) => Promise<void>
}

function MatchDaySlide({ day, scoreSelections, onScoreChange, onValidate }: MatchDaySlideProps) {
    return (
        <ScrollArea className="h-full" type="auto">
            <div className="divide-y divide-gray-100">
                {day.matches.map(match => (
                    <MatchRow
                        key={match.id}
                        match={match}
                        scoreSelections={scoreSelections}
                        onScoreChange={onScoreChange}
                        onValidate={onValidate}
                    />
                ))}
            </div>
        </ScrollArea>
    )
}

interface MatchRowProps {
    match: PendingMatch
    scoreSelections: Map<string, string>
    onScoreChange: (matchId: string, value: string) => void
    onValidate: (match: PendingMatch, score: string) => Promise<void>
}

function MatchRow({ match, scoreSelections, onScoreChange, onValidate }: MatchRowProps) {
    const p1 = match.player1
    const p2 = match.player2
    const p1Name = p1 ? `${p1.first_name} ${p1.last_name}` : "?"
    const p2Name = p2 ? `${p2.first_name} ${p2.last_name}` : "?"
    const time = formatMatchTime(match.match_time)

    // Pour waiting_one : pré-rempli avec le pending existant
    const initialScore = match.status === "waiting_one"
        ? (match.pending_score_p1 ?? match.pending_score_p2 ?? "")
        : ""
    const selectedScore = scoreSelections.get(match.id) ?? initialScore

    return (
        <div className="py-2 px-1.5 space-y-1.5 text-xs">
            {/* Ligne info */}
            <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-muted-foreground tabular-nums shrink-0 text-[11px] w-9">
                    {time}
                </span>
                <Badge
                    variant={getStatusBadgeVariant(match.status)}
                    className="text-[10px] px-1.5 py-0 shrink-0"
                >
                    {getStatusLabel(match.status)}
                </Badge>
                <span className="flex-1 truncate text-[11px]">
                    <span className="font-medium">{p1Name}</span>
                    <span className="text-muted-foreground mx-0.5">–</span>
                    <span className="font-medium">{p2Name}</span>
                </span>
            </div>

            {/* Ligne action */}
            {match.status === "conflict" ? (
                <div className="space-y-1 pl-10">
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-[10px] w-6">P1 :</span>
                        <span className="font-mono font-medium text-[11px] w-8 text-center">
                            {match.pending_score_p1}
                        </span>
                        <button
                            onClick={() => onValidate(match, match.pending_score_p1!)}
                            className="ml-auto text-[10px] px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                            Valider P1
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-[10px] w-6">P2 :</span>
                        <span className="font-mono font-medium text-[11px] w-8 text-center">
                            {match.pending_score_p2}
                        </span>
                        <button
                            onClick={() => onValidate(match, match.pending_score_p2!)}
                            className="ml-auto text-[10px] px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                            Valider P2
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-1 pl-10">
                    <select
                        aria-label={`Score pour ${p1Name} vs ${p2Name}`}
                        value={selectedScore}
                        onChange={(e) => onScoreChange(match.id, e.target.value)}
                        className="flex-1 h-6 text-[11px] border border-gray-300 rounded px-1 bg-white"
                    >
                        {SCORE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => onValidate(match, selectedScore)}
                        disabled={!selectedScore}
                        className="text-[10px] px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        Valider
                    </button>
                </div>
            )}
        </div>
    )
}

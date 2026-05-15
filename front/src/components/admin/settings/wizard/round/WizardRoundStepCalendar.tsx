import type { Event, EventRound, CalendarType } from "@/types/event"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { minutesToInterval, intervalToMinutes, formatTimeForInput } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiDateCalendar } from "@/components/ui/multi-date-calendar"
import { Calendar03Icon, Cancel01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"

interface WizardRoundStepCalendarProps {
    event: Event
    round: EventRound | null
    nextRoundNumber: number
    onSave: (savedRound: EventRound) => void
    onPrevious?: () => void
}

function CalendarDaySelection({
    playingDates,
    setPlayingDates,
}: {
    playingDates: string[]
    setPlayingDates: (d: string[]) => void
}) {
    const sorted = useMemo(() => [...playingDates].sort(), [playingDates])

    return (
        <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
                <Label>
                    Jours des matchs <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                    Sélectionnez les dates précises où les matchs se déroulent.
                </p>
                <MultiDateCalendar
                    selectedDates={playingDates}
                    onChange={setPlayingDates}
                />
            </div>

            <div className="flex flex-col gap-4">
                <div className="bg-muted/30 rounded-lg p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar03Icon className="h-4 w-4 text-muted-foreground" />
                        <Label>Jours sélectionnés</Label>
                    </div>
                    {sorted.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucun jour sélectionné</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {sorted.map(date => (
                                <span
                                    key={date}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 text-xs font-medium"
                                >
                                    {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
                                        weekday: "short", day: "numeric", month: "short",
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => setPlayingDates(playingDates.filter(d => d !== date))}
                                        className="ml-1 text-muted-foreground hover:text-foreground"
                                    >
                                        <Cancel01Icon className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function CalendarPeriod({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
}: {
    startDate: string
    endDate: string
    setStartDate: (d: string) => void
    setEndDate: (d: string) => void
}) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="start_date">
                    Date de début <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="end_date">
                    Date de fin <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                />
            </div>
        </div>
    )
}

export function WizardRoundStepCalendar({
    event,
    round,
    nextRoundNumber,
    onSave,
    onPrevious,
}: WizardRoundStepCalendarProps) {
    const calendarType: CalendarType = event.calendar_type ?? "day_selection"

    // Champs horaires / terrains (partagés)
    const [startTime, setStartTime]       = useState("19:00")
    const [endTime, setEndTime]           = useState("23:00")
    const [courts, setCourts]             = useState(1)
    const [matchDuration, setMatchDuration] = useState(30)

    // Champs calendrier — day_selection
    const [playingDates, setPlayingDates] = useState<string[]>([])

    // Champs calendrier — period
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate]     = useState("")

    // Deadline (commun)
    const [deadline, setDeadline] = useState("")
    const [loading, setLoading]   = useState(false)
    const [error, setError]       = useState("")

    useEffect(() => {
        if (round) {
            setStartTime(formatTimeForInput(round.start_time) || "19:00")
            setEndTime(formatTimeForInput(round.end_time) || "23:00")
            setCourts(round.number_of_courts)
            setMatchDuration(intervalToMinutes(round.estimated_match_duration))
            setDeadline(round.deadline || "")

            if (calendarType === "day_selection") {
                setPlayingDates(round.playing_dates || [])
            } else {
                setStartDate(round.start_date || "")
                setEndDate(round.end_date || "")
            }
        }
    }, [round, calendarType])

    const validate = (): string => {
        if (calendarType === "day_selection" && playingDates.length === 0)
            return "Sélectionnez au moins une date de jeu"
        if (calendarType === "period" && !startDate)
            return "La date de début est requise"
        if (calendarType === "period" && !endDate)
            return "La date de fin est requise"
        if (calendarType === "period" && endDate < startDate)
            return "La date de fin doit être après la date de début"
        return ""
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const validationError = validate()
        if (validationError) { setError(validationError); return }

        setError("")
        setLoading(true)

        const sorted = calendarType === "day_selection"
            ? [...playingDates].sort()
            : []

        const roundData = {
            start_time: startTime || null,
            end_time: endTime || null,
            number_of_courts: courts,
            estimated_match_duration: matchDuration ? minutesToInterval(matchDuration) : null,
            deadline: deadline || null,
            ...(calendarType === "day_selection"
                ? {
                    start_date: sorted[0],
                    end_date: sorted[sorted.length - 1],
                    playing_dates: sorted,
                }
                : {
                    start_date: startDate,
                    end_date: endDate,
                    playing_dates: null,
                }),
        }

        try {
            if (round) {
                const { data, error: err } = await supabase
                    .from("event_rounds")
                    .update(roundData)
                    .eq("id", round.id)
                    .select()
                    .single()
                if (err) { toast.error("Impossible de modifier la série"); return }
                toast.success("Série mise à jour")
                onSave(data as EventRound)
            } else {
                const { data, error: err } = await supabase
                    .from("event_rounds")
                    .insert([{ event_id: event.id, round_number: nextRoundNumber, status: "upcoming", ...roundData }])
                    .select()
                    .single()
                if (err) { toast.error("Impossible de créer la série"); return }
                toast.success("Série créée")
                onSave(data as EventRound)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-6 pt-2 pb-4">
                {/* Section horaires & terrains */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="start_time">Heure de début</Label>
                        <Input
                            id="start_time"
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="end_time">Heure de fin</Label>
                        <Input
                            id="end_time"
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="courts">
                            Terrains <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="courts"
                            type="number"
                            min={1}
                            value={courts}
                            onChange={e => setCourts(parseInt(e.target.value) || 1)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="match_duration">Durée match (min)</Label>
                        <Input
                            id="match_duration"
                            type="number"
                            min={5}
                            max={180}
                            value={matchDuration}
                            onChange={e => setMatchDuration(parseInt(e.target.value) || 30)}
                        />
                    </div>
                </div>

                {/* Séparateur visuel */}
                <div className="border-t border-gray-100" />

                {/* Section calendrier selon le type de l'event */}
                {calendarType === "day_selection" ? (
                    <CalendarDaySelection
                        playingDates={playingDates}
                        setPlayingDates={setPlayingDates}
                    />
                ) : (
                    <CalendarPeriod
                        startDate={startDate}
                        endDate={endDate}
                        setStartDate={setStartDate}
                        setEndDate={setEndDate}
                    />
                )}

                {/* Deadline */}
                <div className="grid gap-2 max-w-xs">
                    <Label htmlFor="deadline">Date limite (optionnelle)</Label>
                    <p className="text-xs text-muted-foreground">
                        La série sera automatiquement marquée comme terminée après cette date.
                    </p>
                    <Input
                        id="deadline"
                        type="date"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex justify-between pt-4">
                {onPrevious ? (
                    <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                        <ArrowLeft01Icon className="h-4 w-4" />
                        Précédent
                    </Button>
                ) : (
                    <span />
                )}
                <Button type="submit" size="lg" disabled={loading}>
                    {loading ? "Enregistrement…" : "Suivant"}
                    <ArrowRight01Icon className="h-4 w-4" />
                </Button>
            </div>
        </form>
    )
}

import { supabase } from "@/lib/supabaseClient"
import type { Event } from "@/types/event"
import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { eventSchema } from "@/lib/schemas"
import { validateFormData } from "@/lib/validation"
import { intervalToMinutes, minutesToInterval } from "@/lib/utils"
import { Calendar03Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiDateCalendar } from "@/components/ui/multi-date-calendar"

/** Strips timezone offset from Supabase time values (e.g. "18:30:00+00" → "18:30") */
function formatTimeForInput(time: string | null | undefined): string | null {
    if (!time) return null
    return time.replace(/([+-]\d{2})$/, "").slice(0, 5)
}

interface WizardStepConfigProps {
    event: Event | null
    onSave: (savedEvent: Event) => void
}

export function WizardStepConfig({ event, onSave }: WizardStepConfigProps) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

    const [eventName, setEventName] = useState("")
    const [startTime, setStartTime] = useState("19:00")
    const [endTime, setEndTime] = useState("23:00")
    const [numberOfCourts, setNumberOfCourts] = useState(4)
    const [matchDuration, setMatchDuration] = useState(30)
    const [playingDates, setPlayingDates] = useState<string[]>([])

    useEffect(() => {
        if (event) {
            setEventName(event.event_name)
            setStartTime(formatTimeForInput(event.start_time) || "19:00")
            setEndTime(formatTimeForInput(event.end_time) || "23:00")
            setNumberOfCourts(event.number_of_courts)
            setMatchDuration(intervalToMinutes(event.estimated_match_duration))
            setPlayingDates(event.playing_dates || [])
        }
    }, [event])

    const sortedDates = [...playingDates].sort()
    const startDate = sortedDates.length > 0 ? sortedDates[0] : ""
    const endDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : ""

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setFieldErrors({})

        if (playingDates.length === 0) {
            setError("Sélectionnez au moins une date de jeu")
            setLoading(false)
            return
        }

        const validation = validateFormData(eventSchema, {
            event_name: eventName,
            start_date: startDate,
            end_date: endDate,
            start_time: startTime || undefined,
            end_time: endTime || undefined,
            number_of_courts: numberOfCourts,
            estimated_match_duration: matchDuration || undefined,
            playing_dates: playingDates,
        })

        if (!validation.success) {
            setFieldErrors(validation.fieldErrors)
            setLoading(false)
            return
        }

        try {
            const { estimated_match_duration: durationMinutes, playing_dates: dates, ...restData } = validation.data
            const eventData = {
                club_id: profile?.club_id,
                ...restData,
                estimated_match_duration: durationMinutes ? minutesToInterval(durationMinutes) : null,
                playing_dates: dates && dates.length > 0 ? dates : null,
            }

            if (event) {
                const { data: updated, error: updateError } = await supabase
                    .from("events")
                    .update(eventData)
                    .eq("id", event.id)
                    .select()
                    .single()

                if (updateError) {
                    setError(updateError.message)
                    return
                }
                if (updated) onSave(updated)
            } else {
                const { data: created, error: insertError } = await supabase
                    .from("events")
                    .insert([eventData])
                    .select()
                    .single()

                if (insertError) {
                    setError(insertError.message)
                    return
                }
                onSave(created)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-8 pt-2 pb-4">
                <div className="grid gap-2">
                    <Label htmlFor="event_name">
                        Nom de l'événement <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="event_name"
                        placeholder="Ex: Série 36"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                    />
                    {fieldErrors.event_name && <p className="text-sm text-red-600">{fieldErrors.event_name[0]}</p>}
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Gauche : Calendrier */}
                    <div className="grid gap-2">
                        <Label>
                            Jours de jeu <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Sélectionnez les dates où les matchs se déroulent.
                        </p>
                        <MultiDateCalendar
                            selectedDates={playingDates}
                            onChange={setPlayingDates}
                        />
                    </div>

                    {/* Droite : Heures, terrains, durée */}
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start_time">Heure de début</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end_time">Heure de fin</Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="number_of_courts">
                                    Terrains <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="number_of_courts"
                                    type="number"
                                    min="1"
                                    value={numberOfCourts}
                                    onChange={(e) => setNumberOfCourts(parseInt(e.target.value))}
                                />
                                {fieldErrors.number_of_courts && <p className="text-sm text-red-600">{fieldErrors.number_of_courts[0]}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="match_duration">
                                    Durée match (min)
                                </Label>
                                <Input
                                    id="match_duration"
                                    type="number"
                                    min="5"
                                    max="180"
                                    value={matchDuration}
                                    onChange={(e) => setMatchDuration(parseInt(e.target.value) || 30)}
                                />
                                {fieldErrors.estimated_match_duration && <p className="text-sm text-red-600">{fieldErrors.estimated_match_duration[0]}</p>}
                            </div>
                        </div>

                        {/* Jours sélectionnés */}
                        <div className="bg-muted/30 rounded-lg p-4 mt-2 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar03Icon className="h-4 w-4 text-muted-foreground" />
                                <Label>Jours sélectionnés</Label>
                            </div>
                            {playingDates.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Aucun jour sélectionné</p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {[...playingDates].sort().map(date => (
                                        <span
                                            key={date}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 text-xs font-medium"
                                        >
                                            {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                                            <button
                                                type="button"
                                                onClick={() => setPlayingDates(playingDates.filter(d => d !== date))}
                                                className="ml-1 text-muted-foreground hover:text-foreground"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                    {loading ? "Enregistrement..." : "Suivant"}
                </Button>
            </div>
        </form>
    )
}

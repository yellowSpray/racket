import type { Event, EventRound } from "@/types/event"
import type { WizardConfigData } from "./WizardStepConfig"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/contexts/AuthContext"
import { eventSchema } from "@/lib/schemas"
import { validateFormData } from "@/lib/validation"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { ValidationError } from "@/lib/errors"
import { toast } from "sonner"
import { minutesToInterval } from "@/lib/utils"
import { Calendar03Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiDateCalendar } from "@/components/ui/multi-date-calendar"

interface WizardStepCalendarProps {
    event: Event | null
    round: EventRound | null
    configData: WizardConfigData
    onSave: (savedEvent: Event, savedRound: EventRound) => void
    onPrevious: () => void
}

export function WizardStepCalendar({ event, round, configData, onSave, onPrevious }: WizardStepCalendarProps) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const { handleError, clearError } = useErrorHandler()

    const [playingDates, setPlayingDates] = useState<string[]>([])
    const [deadline, setDeadline] = useState("")

    useEffect(() => {
        if (round) {
            setPlayingDates(round.playing_dates || [])
            setDeadline(round.deadline || "")
        }
    }, [round])

    const sortedDates = useMemo(() => [...playingDates].sort(), [playingDates])
    const startDate = sortedDates.length > 0 ? sortedDates[0] : ""
    const endDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : ""

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        clearError()

        if (playingDates.length === 0) {
            handleError(new Error("Sélectionnez au moins une date de jeu"))
            setLoading(false)
            return
        }

        const validation = validateFormData(eventSchema, {
            event_name: configData.eventName,
            start_date: startDate,
            end_date: endDate,
            start_time: configData.startTime || undefined,
            end_time: configData.endTime || undefined,
            number_of_courts: configData.numberOfCourts,
            estimated_match_duration: configData.matchDuration || undefined,
            playing_dates: playingDates,
            deadline: deadline || undefined,
        })

        if (!validation.success) {
            handleError(new ValidationError("Erreurs de validation", validation.fieldErrors))
            setLoading(false)
            return
        }

        try {
            const { estimated_match_duration: durationMinutes, playing_dates: dates, deadline: deadlineValue, start_date, end_date, start_time, end_time, number_of_courts, ...eventOnlyData } = validation.data
            const roundData = {
                start_date,
                end_date,
                start_time: start_time ?? null,
                end_time: end_time ?? null,
                number_of_courts,
                estimated_match_duration: durationMinutes ? minutesToInterval(durationMinutes) : null,
                playing_dates: dates && dates.length > 0 ? dates : null,
                deadline: deadlineValue || null,
            }

            let savedEvent: Event
            let savedRound: EventRound

            if (event) {
                // Update event name
                const { data: updated, error: updateError } = await supabase
                    .from("events")
                    .update({ event_name: eventOnlyData.event_name, description: eventOnlyData.description })
                    .eq("id", event.id)
                    .select()
                    .single()

                if (updateError) { handleError(updateError); return }
                savedEvent = updated

                // Update current round
                const currentRoundId = round?.id
                if (currentRoundId) {
                    const { data: updatedRound, error: roundError } = await supabase
                        .from("event_rounds")
                        .update(roundData)
                        .eq("id", currentRoundId)
                        .select()
                        .single()

                    if (roundError) { handleError(roundError); return }
                    savedRound = updatedRound
                } else {
                    const { data: createdRound, error: roundError } = await supabase
                        .from("event_rounds")
                        .insert([{ event_id: event.id, round_number: 1, ...roundData }])
                        .select()
                        .single()

                    if (roundError) { handleError(roundError); return }
                    savedRound = createdRound
                }
                toast.success("Événement modifié")
            } else {
                // Create new event (series)
                const { data: created, error: insertError } = await supabase
                    .from("events")
                    .insert([{ club_id: profile?.club_id, event_name: eventOnlyData.event_name, description: eventOnlyData.description }])
                    .select()
                    .single()

                if (insertError) { handleError(insertError); return }
                savedEvent = created

                // Create round 1
                const { data: createdRound, error: roundError } = await supabase
                    .from("event_rounds")
                    .insert([{ event_id: created.id, round_number: 1, status: "active", ...roundData }])
                    .select()
                    .single()

                if (roundError) { handleError(roundError); return }
                savedRound = createdRound
                toast.success("Événement créé")
            }

            onSave(savedEvent, savedRound)
        } catch (err) {
            handleError(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-6 pt-2 pb-4">
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

                    {/* Droite : Résumé dates + deadline */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-muted/30 rounded-lg p-4 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar03Icon className="h-4 w-4 text-muted-foreground" />
                                <Label>Jours sélectionnés</Label>
                            </div>
                            {playingDates.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Aucun jour sélectionné</p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {sortedDates.map(date => (
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

                        <div className="grid gap-2">
                            <Label htmlFor="deadline">Date limite</Label>
                            <p className="text-xs text-muted-foreground">
                                L'événement sera automatiquement marqué comme terminé après cette date.
                            </p>
                            <Input
                                id="deadline"
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                    Précédent
                </Button>
                <Button type="submit" disabled={loading} size="lg">
                    {loading ? "Enregistrement..." : "Suivant"}
                </Button>
            </div>
        </form>
    )
}

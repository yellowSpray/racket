import type { Event } from "@/types/event"
import type { WizardConfigData } from "./WizardStepConfig"
import { useState, useEffect } from "react"
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
    configData: WizardConfigData
    onSave: (savedEvent: Event) => void
    onPrevious: () => void
}

export function WizardStepCalendar({ event, configData, onSave, onPrevious }: WizardStepCalendarProps) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const { handleError, clearError } = useErrorHandler()

    const [playingDates, setPlayingDates] = useState<string[]>([])
    const [deadline, setDeadline] = useState("")

    useEffect(() => {
        if (event) {
            setPlayingDates(event.playing_dates || [])
            setDeadline(event.deadline || "")
        }
    }, [event])

    const sortedDates = [...playingDates].sort()
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
            const { estimated_match_duration: durationMinutes, playing_dates: dates, deadline: deadlineValue, ...restData } = validation.data
            const eventData = {
                club_id: profile?.club_id,
                ...restData,
                estimated_match_duration: durationMinutes ? minutesToInterval(durationMinutes) : null,
                playing_dates: dates && dates.length > 0 ? dates : null,
                deadline: deadlineValue || null,
            }

            if (event) {
                const { data: updated, error: updateError } = await supabase
                    .from("events")
                    .update(eventData)
                    .eq("id", event.id)
                    .select()
                    .single()

                if (updateError) {
                    handleError(updateError)
                    return
                }
                if (updated) {
                    toast.success("Événement modifié")
                    onSave(updated)
                }
            } else {
                const { data: created, error: insertError } = await supabase
                    .from("events")
                    .insert([eventData])
                    .select()
                    .single()

                if (insertError) {
                    handleError(insertError)
                    return
                }
                toast.success("Événement créé")
                onSave(created)
            }
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

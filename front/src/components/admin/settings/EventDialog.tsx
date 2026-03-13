import { supabase } from "@/lib/supabaseClient"
import type { Event } from "@/types/event"
import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { eventSchema } from "@/lib/schemas"
import { validateFormData } from "@/lib/validation"
import { intervalToMinutes, minutesToInterval } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiDateCalendar } from "@/components/ui/multi-date-calendar"

export interface ClubDefaults {
    startTime?: string
    endTime?: string
    numberOfCourts?: number
    matchDuration?: number
}

interface EventDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: Event | null
    onSuccess: () => void
    clubDefaults?: ClubDefaults
}

export function EventDialog({ open, onOpenChange, event, onSuccess, clubDefaults}: EventDialogProps) {
    const { profile } = useAuth()
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

    // form state
    const [eventName, setEventName] = useState<string>("")
    const [startTime, setStartTime] = useState<string>(clubDefaults?.startTime ?? "19:00")
    const [endTime, setEndTime] = useState<string>(clubDefaults?.endTime ?? "23:00")
    const [numberOfCourts, setNumberOfCourts] = useState<number>(clubDefaults?.numberOfCourts ?? 4)
    const [matchDuration, setMatchDuration] = useState<number>(clubDefaults?.matchDuration ?? 30)
    const [playingDates, setPlayingDates] = useState<string[]>([])

    // reset form open/close
    useEffect(() => {
        if(open){
            if(event){
                setEventName(event.event_name)
                setStartTime(event.start_time || "19:00")
                setEndTime(event.end_time || "23:00")
                setNumberOfCourts(event.number_of_courts)
                setMatchDuration(intervalToMinutes(event.estimated_match_duration))
                setPlayingDates(event.playing_dates || [])
            } else {
                setEventName("")
                setStartTime(clubDefaults?.startTime ?? "19:00")
                setEndTime(clubDefaults?.endTime ?? "23:00")
                setNumberOfCourts(clubDefaults?.numberOfCourts ?? 4)
                setMatchDuration(clubDefaults?.matchDuration ?? 30)
                setPlayingDates([])
            }
            setError(null)
            setFieldErrors({})
        }
    }, [open, event])

    // Dériver start_date et end_date des dates sélectionnées
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

            if(event){
                const { error: updateError } = await supabase
                    .from("events")
                    .update(eventData)
                    .eq("id", event.id)

                if(updateError) {
                    setError(updateError.message)
                    return
                }
            } else {
                const { error: insertError } = await supabase
                    .from("events")
                    .insert([eventData])
                    .select()

                if(insertError) {
                    setError(insertError.message)
                    return
                }
            }

            onSuccess()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>

                    <DialogHeader>
                        <DialogTitle>
                            {event ? "Modifier l'événement" : "Créer l'événement"}
                        </DialogTitle>
                        <DialogDescription>
                            {event
                                ? "Modifiez les informations de l'événement"
                                : "Remplissez les informations pour créer un nouvel événement"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">

                        {/* Nom de l'événement */}
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

                        {/* Calendrier des jours de jeu */}
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

                        {/* Horaires */}
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

                        {/* Terrains et durée */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="number_of_courts">
                                    Nombre de terrains <span className="text-red-500">*</span>
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
                                    Durée d'un match (min)
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

                        {/* Erreur */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Enregistrement..." : event ? "Modifier" : "Créer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

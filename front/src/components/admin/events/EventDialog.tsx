import { supabase } from "@/lib/supabaseClient"
import type { Event } from "@/types/event"
import React, { useEffect, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"

interface EventDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: Event | null
    onSuccess: () => void
}

export function EventDialog({ open, onOpenChange, event, onSuccess}: EventDialogProps) {
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    // form state
    const [eventName, setEventName] = useState<string>("")
    const [description, setDescription] = useState<string>("")
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")
    const [startTime, setStartTime] = useState<string>("19:00")
    const [endTime, setEndTime] = useState<string>("23:00")
    const [numberOfCourts, setNumberOfCourts] = useState<number>(4)

    // reset form open/close
    useEffect(() => {
        if(open){
            if(event){
                // mode edition
                setEventName(event.event_name)
                setDescription(event.description || "")
                setStartDate(event.start_date)
                setEndDate(event.end_date)
                setStartTime(event.start_time || "19:00")
                setEndTime(event.end_time || "23:00")
                setNumberOfCourts(event.number_of_courts)
            } else {
                // mode creation
                setEventName("")
                setDescription("")
                setStartDate("")
                setEndDate("")
                setStartTime("19:00")
                setEndTime("23:00")
                setNumberOfCourts(4)
            }
            setError(null)
        }
    }, [open, event])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const eventData = {
                event_name: eventName,
                description: description || null,
                startDate: startDate,
                endDate: endDate,
                start_time: startTime,
                end_time: endTime,
                number_of_courts: numberOfCourts
            }
            
            if(event){
                // edition
                const { error: updateError } = await supabase
                    .from("events")
                    .update(eventData)
                    .eq("id", event.id)
                
                if(updateError) {
                    setError(updateError.message)
                    return
                }
            } else {
                // creation
                const { error: insertError } = await supabase
                    .from("events")
                    .insert([eventData])
                
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
            <DialogContent className="sm:max-w-[600px] bg-white">
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
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Description de l'événement (optionnel)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start_date">
                                    Date de début <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
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
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
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

                        {/* Nombre de terrains */}
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
                                required
                            />
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
import type { Event } from "@/types/event"
import { useEffect, useState } from "react"
import { intervalToMinutes, formatTimeForInput } from "@/lib/utils"
import type { ClubDefaults } from "../EventDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface WizardConfigData {
    eventName: string
    startTime: string
    endTime: string
    numberOfCourts: number
    matchDuration: number
}

interface WizardStepConfigProps {
    event: Event | null
    configData: WizardConfigData | null
    onNext: (data: WizardConfigData) => void
    clubDefaults?: ClubDefaults
}

export function WizardStepConfig({ event, configData, onNext, clubDefaults }: WizardStepConfigProps) {
    const [eventName, setEventName] = useState("")
    const [startTime, setStartTime] = useState(clubDefaults?.startTime ?? "19:00")
    const [endTime, setEndTime] = useState(clubDefaults?.endTime ?? "23:00")
    const [numberOfCourts, setNumberOfCourts] = useState(clubDefaults?.numberOfCourts ?? 4)
    const [matchDuration, setMatchDuration] = useState(clubDefaults?.matchDuration ?? 30)
    const [error, setError] = useState("")

    useEffect(() => {
        if (configData) {
            setEventName(configData.eventName)
            setStartTime(configData.startTime)
            setEndTime(configData.endTime)
            setNumberOfCourts(configData.numberOfCourts)
            setMatchDuration(configData.matchDuration)
        } else if (event) {
            setEventName(event.event_name)
            setStartTime(formatTimeForInput(event.start_time) || "19:00")
            setEndTime(formatTimeForInput(event.end_time) || "23:00")
            setNumberOfCourts(event.number_of_courts)
            setMatchDuration(intervalToMinutes(event.estimated_match_duration))
        }
    }, [event, configData])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!eventName.trim()) {
            setError("Le nom de l'événement est requis")
            return
        }

        onNext({
            eventName: eventName.trim(),
            startTime,
            endTime,
            numberOfCourts,
            matchDuration,
        })
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-6 pt-2 pb-4">
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
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

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
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="match_duration">Durée match (min)</Label>
                        <Input
                            id="match_duration"
                            type="number"
                            min="5"
                            max="180"
                            value={matchDuration}
                            onChange={(e) => setMatchDuration(parseInt(e.target.value) || 30)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" size="lg">
                    Suivant
                </Button>
            </div>
        </form>
    )
}

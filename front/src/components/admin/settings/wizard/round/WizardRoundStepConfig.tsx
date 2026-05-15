import type { EventRound } from "@/types/event"
import { useEffect, useState } from "react"
import { intervalToMinutes, formatTimeForInput } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight01Icon } from "hugeicons-react"

export interface WizardRoundConfigData {
    startTime: string
    endTime: string
    courts: number
    matchDuration: number
}

interface WizardRoundStepConfigProps {
    round: EventRound | null
    configData: WizardRoundConfigData | null
    onNext: (data: WizardRoundConfigData) => void
}

export function WizardRoundStepConfig({ round, configData, onNext }: WizardRoundStepConfigProps) {
    const [startTime, setStartTime] = useState("19:00")
    const [endTime, setEndTime] = useState("23:00")
    const [courts, setCourts] = useState(1)
    const [matchDuration, setMatchDuration] = useState(30)

    useEffect(() => {
        if (configData) {
            setStartTime(configData.startTime)
            setEndTime(configData.endTime)
            setCourts(configData.courts)
            setMatchDuration(configData.matchDuration)
        } else if (round) {
            setStartTime(formatTimeForInput(round.start_time) || "19:00")
            setEndTime(formatTimeForInput(round.end_time) || "23:00")
            setCourts(round.number_of_courts)
            setMatchDuration(intervalToMinutes(round.estimated_match_duration))
        }
    }, [configData, round])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onNext({ startTime, endTime, courts, matchDuration })
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-6 pt-2 pb-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" size="lg">
                    Suivant
                    <ArrowRight01Icon className="h-4 w-4" />
                </Button>
            </div>
        </form>
    )
}

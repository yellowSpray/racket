import type { Event } from "@/types/event"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight01Icon } from "hugeicons-react"

interface WizardEventStepInfoProps {
    event: Event | null
    initialName?: string
    onNext: (eventName: string) => void
}

export function WizardEventStepInfo({ event, initialName, onNext }: WizardEventStepInfoProps) {
    const [eventName, setEventName] = useState(initialName ?? "")
    const [error, setError] = useState("")

    useEffect(() => {
        if (event) setEventName(event.event_name)
        else if (initialName) setEventName(initialName)
    }, [event, initialName])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!eventName.trim()) {
            setError("Le nom de l'événement est requis")
            return
        }
        setError("")
        onNext(eventName.trim())
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-6 pt-2 pb-4">
                <div>
                    <p className="text-sm text-muted-foreground mb-6">
                        Donnez un nom à cette série. Il identifiera l'événement dans toute l'application.
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="event_name">
                            Nom de l'événement <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="event_name"
                            placeholder="Ex: Série printemps 2025"
                            value={eventName}
                            onChange={(e) => { setEventName(e.target.value); setError("") }}
                            autoFocus
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
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

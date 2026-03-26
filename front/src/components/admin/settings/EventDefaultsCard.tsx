import { useState, useEffect } from "react"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PencilEdit01Icon, Tick02Icon, Loading03Icon, Calendar03Icon } from "hugeicons-react"

interface EventDefaultsCardProps {
    defaultStartTime: string
    defaultEndTime: string
    defaultNumberOfCourts: number
    defaultMatchDuration: number
    onSave: (data: {
        default_start_time: string
        default_end_time: string
        default_number_of_courts: number
        default_match_duration: number
    }) => Promise<boolean>
}

export function EventDefaultsCard({
    defaultStartTime,
    defaultEndTime,
    defaultNumberOfCourts,
    defaultMatchDuration,
    onSave,
}: EventDefaultsCardProps) {

    const [startTime, setStartTime] = useState(defaultStartTime)
    const [endTime, setEndTime] = useState(defaultEndTime)
    const [courts, setCourts] = useState(defaultNumberOfCourts)
    const [duration, setDuration] = useState(defaultMatchDuration)
    const { handleError, clearError } = useErrorHandler()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => { setStartTime(defaultStartTime) }, [defaultStartTime])
    useEffect(() => { setEndTime(defaultEndTime) }, [defaultEndTime])
    useEffect(() => { setCourts(defaultNumberOfCourts) }, [defaultNumberOfCourts])
    useEffect(() => { setDuration(defaultMatchDuration) }, [defaultMatchDuration])

    const handleToggle = async () => {
        if (!editing) {
            setEditing(true)
            setSaved(false)
            return
        }

        clearError()
        if (startTime >= endTime) {
            handleError(new Error("L'heure de début doit être avant l'heure de fin"))
            return
        }
        if (courts < 1 || courts > 20) {
            handleError(new Error("Le nombre de terrains doit être entre 1 et 20"))
            return
        }
        if (duration < 5 || duration > 180) {
            handleError(new Error("La durée doit être entre 5 et 180 minutes"))
            return
        }

        setSaving(true)
        const success = await onSave({
            default_start_time: startTime,
            default_end_time: endTime,
            default_number_of_courts: courts,
            default_match_duration: duration,
        })
        setSaving(false)

        if (success) {
            setEditing(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col items-start gap-3">
                    <CardTitle className="flex flex-row items-center gap-2">
                        <Calendar03Icon size={16} className="text-foreground" />
                        Événement par défaut
                    </CardTitle>
                    <CardDescription>
                        {editing
                            ? "Les modifications s'appliqueront au prochain événement"
                            : "Valeurs par défaut à la création d'événement"
                        }
                    </CardDescription>
                </div>
                <CardAction>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shadow-none"
                        onClick={handleToggle}
                        disabled={saving}
                        aria-label={editing ? "Enregistrer" : "Modifier"}
                    >
                        {saving ? (
                            <Loading03Icon className="h-4 w-4 animate-spin" />
                        ) : saved ? (
                            <Tick02Icon className="h-4 w-4 text-green-600" />
                        ) : editing ? (
                            <Tick02Icon className="h-4 w-4" />
                        ) : (
                            <PencilEdit01Icon className="h-4 w-4" />
                        )}
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="flex flex-col gap-4 flex-1 bg-muted/50 rounded-lg p-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="default_start_time" className="text-xs text-muted-foreground">Heure de début</Label>
                            <Input
                                id="default_start_time"
                                type="time"
                                value={startTime}
                                onChange={(e) => { setStartTime(e.target.value); setSaved(false) }}
                                disabled={!editing}
                                aria-label="Heure de début"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="default_end_time" className="text-xs text-muted-foreground">Heure de fin</Label>
                            <Input
                                id="default_end_time"
                                type="time"
                                value={endTime}
                                onChange={(e) => { setEndTime(e.target.value); setSaved(false) }}
                                disabled={!editing}
                                aria-label="Heure de fin"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="default_courts" className="text-xs text-muted-foreground">Nombre de terrains</Label>
                            <Input
                                id="default_courts"
                                type="number"
                                min={1}
                                max={20}
                                value={courts}
                                onChange={(e) => { setCourts(parseInt(e.target.value) || 1); setSaved(false) }}
                                disabled={!editing}
                                aria-label="Nombre de terrains"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="default_duration" className="text-xs text-muted-foreground">Durée de match</Label>
                            <div className="relative">
                                <Input
                                    id="default_duration"
                                    type="number"
                                    min={5}
                                    max={180}
                                    value={duration}
                                    onChange={(e) => { setDuration(parseInt(e.target.value) || 5); setSaved(false) }}
                                    disabled={!editing}
                                    aria-label="Durée de match"
                                    className="pr-10"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

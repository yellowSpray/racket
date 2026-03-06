import { useEffect, useState } from "react"
import { useEventCourts } from "@/hooks/useEventCourts"
import { useEvent } from "@/contexts/EventContext"
import { validateFormData } from "@/lib/validation"
import { courtSchema } from "@/lib/schemas/court.schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Clock } from "lucide-react"
import { CourtsSkeleton } from "@/components/shared/skeletons/SettingsSkeleton"

export function CourtsManager() {

    const { currentEvent } = useEvent()
    const { courts, loading, error, fetchCourts, addCourt, updateCourt, removeCourt, initCourts } = useEventCourts()

    const [showAddForm, setShowAddForm] = useState(false)
    const [courtName, setCourtName] = useState("")
    const [availableFrom, setAvailableFrom] = useState("19:00")
    const [availableTo, setAvailableTo] = useState("23:00")
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchCourts(currentEvent?.id ?? null)
    }, [currentEvent?.id, fetchCourts])

    if (!currentEvent) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-gray-500">
                    Sélectionnez un événement pour gérer les terrains
                </CardContent>
            </Card>
        )
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        setFieldErrors({})

        const data = { court_name: courtName, available_from: availableFrom, available_to: availableTo }
        const result = validateFormData(courtSchema, data)
        if (!result.success) {
            setFieldErrors(result.fieldErrors)
            return
        }

        setSaving(true)
        const success = await addCourt(currentEvent.id, result.data)
        setSaving(false)

        if (success) {
            setCourtName("")
            setShowAddForm(false)
        }
    }

    const handleTimeUpdate = async (courtId: string, field: 'available_from' | 'available_to', value: string) => {
        await updateCourt(courtId, { [field]: value })
    }

    const handleNameUpdate = async (courtId: string, value: string) => {
        if (value.trim()) {
            await updateCourt(courtId, { court_name: value })
        }
    }

    const handleInitCourts = async () => {
        const from = currentEvent.start_time?.match(/(\d{2}:\d{2})/)?.[1] || "19:00"
        const to = currentEvent.end_time?.match(/(\d{2}:\d{2})/)?.[1] || "23:00"
        await initCourts(currentEvent.id, currentEvent.number_of_courts, from, to)
    }

    const calculateSlots = (from: string, to: string): number => {
        if (!currentEvent.estimated_match_duration) return 0
        const [fH, fM] = from.split(":").map(Number)
        const [tH, tM] = to.split(":").map(Number)
        const totalMinutes = (tH * 60 + tM) - (fH * 60 + fM)
        const match = currentEvent.estimated_match_duration.match(/(\d{2}):(\d{2})/)
        if (!match) return 0
        const durationMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
        if (durationMinutes <= 0) return 0
        return Math.floor(totalMinutes / durationMinutes)
    }

    if (loading) return <CourtsSkeleton />

    return (
        <Card>
            <CardHeader>
                <CardTitle>Terrains — {currentEvent.event_name}</CardTitle>
                <CardDescription>
                    Configurez les terrains et leurs disponibilités pour cet événement
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

                {courts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <Clock className="mx-auto h-10 w-10 text-gray-400" />
                        <p className="mt-3 text-gray-500">Aucun terrain configuré</p>
                        <div className="flex gap-2 justify-center mt-4">
                            <Button onClick={handleInitCourts} variant="outline">
                                Initialiser {currentEvent.number_of_courts} terrain{currentEvent.number_of_courts > 1 ? 's' : ''}
                            </Button>
                            <Button onClick={() => setShowAddForm(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Ajouter manuellement
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Terrain</TableHead>
                                        <TableHead className="text-center">Début</TableHead>
                                        <TableHead className="text-center">Fin</TableHead>
                                        <TableHead className="text-center">Créneaux</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {courts.map((court) => (
                                        <TableRow key={court.id}>
                                            <TableCell>
                                                <Input
                                                    defaultValue={court.court_name}
                                                    className="w-40"
                                                    onBlur={(e) => handleNameUpdate(court.id, e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="time"
                                                    defaultValue={court.available_from}
                                                    className="w-28 mx-auto"
                                                    onBlur={(e) => handleTimeUpdate(court.id, 'available_from', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="time"
                                                    defaultValue={court.available_to}
                                                    className="w-28 mx-auto"
                                                    onBlur={(e) => handleTimeUpdate(court.id, 'available_to', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center text-gray-500">
                                                {calculateSlots(court.available_from, court.available_to) || "—"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeCourt(court.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => setShowAddForm(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Ajouter un terrain
                        </Button>
                    </>
                )}

                {showAddForm && (
                    <form onSubmit={handleAdd} className="mt-4 p-4 border rounded-lg space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="court_name">Nom</Label>
                                <Input
                                    id="court_name"
                                    value={courtName}
                                    onChange={(e) => setCourtName(e.target.value)}
                                    placeholder={`Terrain ${courts.length + 1}`}
                                />
                                {fieldErrors.court_name && (
                                    <p className="text-sm text-red-600">{fieldErrors.court_name[0]}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="available_from">Début</Label>
                                <Input
                                    id="available_from"
                                    type="time"
                                    value={availableFrom}
                                    onChange={(e) => setAvailableFrom(e.target.value)}
                                />
                                {fieldErrors.available_from && (
                                    <p className="text-sm text-red-600">{fieldErrors.available_from[0]}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="available_to">Fin</Label>
                                <Input
                                    id="available_to"
                                    type="time"
                                    value={availableTo}
                                    onChange={(e) => setAvailableTo(e.target.value)}
                                />
                                {fieldErrors.available_to && (
                                    <p className="text-sm text-red-600">{fieldErrors.available_to[0]}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={saving}>Ajouter</Button>
                            <Button type="button" variant="outline" onClick={() => { setShowAddForm(false); setFieldErrors({}) }}>
                                Annuler
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}

import { useState } from "react"
import { cn } from "@/lib/utils"
import { validateFormData } from "@/lib/validation"
import { courtSchema } from "@/lib/schemas/court.schema"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { ValidationError } from "@/lib/errors"
import type { ClubCourt } from "@/types/settings"
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
import { PlusSignIcon, Delete02Icon, VolleyballIcon } from "hugeicons-react"
import { CourtsSkeleton } from "@/components/shared/skeletons/SettingsSkeleton"

interface ClubCourtsCardProps {
    courts: ClubCourt[]
    loading: boolean
    error: string | null
    defaultNumberOfCourts: number
    defaultStartTime: string
    defaultEndTime: string
    onAdd: (data: { court_name: string; available_from: string; available_to: string }) => Promise<boolean>
    onUpdate: (courtId: string, data: Partial<{ court_name: string; available_from: string; available_to: string }>) => Promise<boolean>
    onRemove: (courtId: string) => Promise<boolean>
    onInit: (numberOfCourts: number, availableFrom: string, availableTo: string) => Promise<boolean>
    className?: string
}

export function ClubCourtsCard({
    courts,
    loading,
    error,
    defaultNumberOfCourts,
    defaultStartTime,
    defaultEndTime,
    onAdd,
    onUpdate,
    onRemove,
    onInit,
    className,
}: ClubCourtsCardProps) {

    const [showAddForm, setShowAddForm] = useState(false)
    const [courtName, setCourtName] = useState("")
    const [availableFrom, setAvailableFrom] = useState(defaultStartTime)
    const [availableTo, setAvailableTo] = useState(defaultEndTime)
    const { handleError, clearError, getFieldError } = useErrorHandler()
    const [saving, setSaving] = useState(false)

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        clearError()

        const data = { court_name: courtName, available_from: availableFrom, available_to: availableTo }
        const result = validateFormData(courtSchema, data)
        if (!result.success) {
            handleError(new ValidationError("Erreurs de validation", result.fieldErrors))
            return
        }

        setSaving(true)
        const success = await onAdd(result.data)
        setSaving(false)

        if (success) {
            setCourtName("")
            setShowAddForm(false)
        }
    }

    const handleTimeUpdate = async (courtId: string, field: 'available_from' | 'available_to', value: string) => {
        await onUpdate(courtId, { [field]: value })
    }

    const handleNameUpdate = async (courtId: string, value: string) => {
        if (value.trim()) {
            await onUpdate(courtId, { court_name: value })
        }
    }

    const handleInitCourts = async () => {
        await onInit(defaultNumberOfCourts, defaultStartTime, defaultEndTime)
    }

    if (loading) return <CourtsSkeleton />

    return (
        <Card className={cn(className)}>
            <CardHeader>
                <CardTitle className="flex flex-row items-center gap-2">
                    <VolleyballIcon size={16} className="text-foreground" />
                    Terrains du club
                </CardTitle>
                <CardDescription>
                    Définissez les terrains de votre club — ils seront copiés automatiquement à chaque nouvel événement
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

                {courts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <VolleyballIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
                        <p className="mt-3 text-muted-foreground">Aucun terrain configuré</p>
                        <div className="flex gap-2 justify-center mt-4">
                            <Button onClick={handleInitCourts} variant="outline">
                                Initialiser {defaultNumberOfCourts} terrain{defaultNumberOfCourts > 1 ? 's' : ''}
                            </Button>
                            <Button onClick={() => setShowAddForm(true)}>
                                <PlusSignIcon className="mr-2 h-4 w-4" /> Ajouter manuellement
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Terrain</TableHead>
                                        <TableHead className="text-center">Début</TableHead>
                                        <TableHead className="text-center">Fin</TableHead>
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
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="icon"
                                                    size="icon"
                                                    onClick={() => onRemove(court.id)}
                                                    aria-label="Supprimer le terrain"
                                                >
                                                    <Delete02Icon className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-center mt-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => setShowAddForm(true)}
                            >
                                <PlusSignIcon className="mr-2 h-4 w-4" /> Ajouter un terrain
                            </Button>
                        </div>
                    </>
                )}

                {showAddForm && (
                    <form onSubmit={handleAdd} data-testid="add-court-form" className="mt-4 p-4 border rounded-lg space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="club_court_name">Nom</Label>
                                <Input
                                    id="club_court_name"
                                    value={courtName}
                                    onChange={(e) => setCourtName(e.target.value)}
                                    placeholder={`Terrain ${courts.length + 1}`}
                                />
                                {getFieldError('court_name') && (
                                    <p className="text-sm text-red-600">{getFieldError('court_name')}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="club_court_from">Début</Label>
                                <Input
                                    id="club_court_from"
                                    type="time"
                                    value={availableFrom}
                                    onChange={(e) => setAvailableFrom(e.target.value)}
                                />
                                {getFieldError('available_from') && (
                                    <p className="text-sm text-red-600">{getFieldError('available_from')}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="club_court_to">Fin</Label>
                                <Input
                                    id="club_court_to"
                                    type="time"
                                    value={availableTo}
                                    onChange={(e) => setAvailableTo(e.target.value)}
                                />
                                {getFieldError('available_to') && (
                                    <p className="text-sm text-red-600">{getFieldError('available_to')}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={saving}>Ajouter</Button>
                            <Button type="button" variant="outline" onClick={() => { setShowAddForm(false); clearError() }}>
                                Annuler
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}

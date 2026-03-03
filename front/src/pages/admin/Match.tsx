import { EventSelector } from "@/components/admin/settings/EventSelector"
import { MatchScheduleGrid } from "@/components/admin/matches/MatchScheduleGrid"
import Loading from "@/components/shared/Loading"
import { useEvent } from "@/contexts/EventContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Trash2, CalendarDays, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { totalMatchCount, totalSlotCount, calculateTimeSlots, calculateDates } from "@/lib/matchScheduler"
import { intervalToMinutes } from "@/lib/utils"

export function MatchAdmin() {

    const { currentEvent } = useEvent()
    const { groups, fetchGroupsByEvent } = useGroups()
    const { matches, loading, error, fetchMatchesByEvent, generateMatches, deleteMatchesByEvent } = useMatches()
    const [generating, setGenerating] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<'generate' | 'delete'>('generate')
    const navigate = useNavigate()

    useEffect(() => {
        if (currentEvent) {
            fetchGroupsByEvent(currentEvent.id)
            fetchMatchesByEvent(currentEvent.id)
        }
    }, [currentEvent])

    // const handleGenerate = async () => {
    //     if (!currentEvent || groups.length === 0) return

    //     // Si des matchs existent déjà, demander confirmation
    //     if (matches.length > 0) {
    //         setConfirmAction('generate')
    //         setConfirmOpen(true)
    //         return
    //     }

    //     await doGenerate()
    // }

    const doGenerate = async () => {
        if (!currentEvent) return
        setGenerating(true)
        // Supprimer les matchs existants si nécessaire
        if (matches.length > 0) {
            await deleteMatchesByEvent(currentEvent.id)
        }
        await generateMatches(currentEvent, groups)
        setGenerating(false)
    }

    const handleDelete = () => {
        setConfirmAction('delete')
        setConfirmOpen(true)
    }

    const doDelete = async () => {
        if (!currentEvent) return
        setGenerating(true)
        await deleteMatchesByEvent(currentEvent.id)
        setGenerating(false)
    }

    const handleConfirm = async () => {
        setConfirmOpen(false)
        if (confirmAction === 'generate') {
            await doGenerate()
        } else {
            await doDelete()
        }
    }

    // Calculs pour l'info
    const matchCount = totalMatchCount(groups)
    const slotInfo = currentEvent ? (() => {
        const durationMin = intervalToMinutes(currentEvent.estimated_match_duration)
        const dates = calculateDates(currentEvent.start_date, currentEvent.end_date, currentEvent.playing_dates)
        const timeSlots = calculateTimeSlots(
            currentEvent.start_time || "19:00",
            currentEvent.end_time || "23:00",
            durationMin
        )
        return {
            total: totalSlotCount(dates.length, timeSlots.length, currentEvent.number_of_courts),
            dates: dates.length,
            slotsPerDay: timeSlots.length,
            courts: currentEvent.number_of_courts,
        }
    })() : null

    if (loading || generating) {
        return <Loading />
    }

    if (!currentEvent) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold">Matchs</h3>
                        <EventSelector />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                        </Button>
                        <Button size="sm" disabled>
                            <Settings className="mr-2 h-4 w-4" />
                            Modifier
                        </Button>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                    <CalendarDays className="h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun match</h3>
                    <p className="text-gray-500 mt-3">
                        Créez un événement depuis les paramètres pour commencer
                    </p>
                    <Button className="mt-6" size="sm" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            </div>
        )
    }

    const hasGroups = groups.length > 0
    const hasPlayers = groups.some(g => (g.players || []).length >= 2)
    const hasMatches = matches.length > 0

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">Matchs</h3>
                    <EventSelector />
                </div>
                <div className="flex gap-2">
                    {hasMatches && (
                        <Button variant="outline" size="sm" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                        </Button>
                    )}
                    <Button size="sm" onClick={() => navigate("/admin/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Modifier
                    </Button>
                </div>
            </div>

            {/* Erreur */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Avertissement matchs manquants */}
            {!error && hasMatches && matchCount > 0 && matches.length < matchCount && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded mb-4">
                    {matches.length}/{matchCount} matchs planifiés. {matchCount - matches.length} match(s) sans créneau — ajoutez des dates ou des terrains dans les paramètres.
                </div>
            )}

            {/* Contenu */}
            {!hasGroups ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
                    <p className="text-gray-500 mt-2">
                        Créez d'abord les tableaux depuis les paramètres pour générer les matchs
                    </p>
                    <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            ) : !hasPlayers ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">Pas assez de joueurs</h3>
                    <p className="text-gray-500 mt-2">
                        Il faut au moins 2 joueurs par groupe pour générer les matchs
                    </p>
                    <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            ) : !hasMatches ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun match généré</h3>
                    <p className="text-gray-500 mt-2">
                        {matchCount} matchs à programmer sur {slotInfo?.total} créneaux disponibles
                        ({slotInfo?.dates} jour{(slotInfo?.dates || 0) > 1 ? 's' : ''} × {slotInfo?.slotsPerDay} créneaux × {slotInfo?.courts} terrain{(slotInfo?.courts || 0) > 1 ? 's' : ''})
                    </p>
                    <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    <MatchScheduleGrid matches={matches} event={currentEvent} />
                </div>
            )}

            {/* Dialog de confirmation */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction === 'generate' ? "Régénérer les matchs ?" : "Supprimer les matchs ?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction === 'generate'
                                ? "Les matchs existants seront supprimés et remplacés par un nouveau planning."
                                : "Tous les matchs de cet événement seront supprimés. Cette action est irréversible."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>
                            {confirmAction === 'generate' ? "Régénérer" : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

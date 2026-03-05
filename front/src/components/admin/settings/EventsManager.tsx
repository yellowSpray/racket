import Loading from "@/components/shared/Loading"
import { useEvent } from "@/contexts/EventContext"
import type { Event } from "@/types/event"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Calendar } from "lucide-react"
import { EventWizardDialog } from "./EventWizardDialog"
import { DeleteEventDialog } from "./DeleteEventDialog"

export function EventsManager() {
    const {events, loading, fetchEvents} = useEvent()
    const [dialogOpen, setDialogOpen] = useState<boolean>(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
    
    // determiner le status de l'event(en cours, terminer, à venir)
    const getEventStatus = (event: Event) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const startDate = new Date(event.start_date)
        const endDate = new Date(event.end_date)

        if(endDate < today) {
            return { label: "Terminé", variant: "default" as const }
        } else if (startDate > today){
            return { label: "À venir", variant: "inactive" as const}
        } else {
            return { label: "En cours", variant: "active" as const}
        }
    }

    // formater les dates
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        })
    }

    // formater les heures
    const formatTime = (timeString: string | undefined) => {
        if (!timeString) return "-"
        const match = timeString.match(/(\d{2}):(\d{2})/)
        if (match) return `${match[1]}:${match[2]}`
        return timeString
    }

    // create
    const handleCreate = () => {
        setSelectedEvent(null)
        setDialogOpen(true)
    }

    // edit
    const handleEdit = (event: Event) => {
        setSelectedEvent(event)
        setDialogOpen(true)
    }

    // delete
    const handleDelete = (event: Event) => {
        setSelectedEvent(event)
        setDeleteDialogOpen(true)
    }

    const handleSuccess = async () => {
        await fetchEvents()
        setDialogOpen(false)
        setDeleteDialogOpen(false)
        setSelectedEvent(null)
    }

    if(loading) {
        return <Loading />
    }

    return (
        <div className="flex flex-col h-full min-h-0">

            {events.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg">
                    <div className="text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun événement</h3>
                        <p className="text-muted-foreground mt-2">
                            Commencez par créer votre premier événement
                        </p>
                        <Button onClick={handleCreate} className="mt-4">
                            <Plus className="mr-2 h-4 w-4" />
                            Créer un événement
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">Nom</TableHead>
                                <TableHead className="text-center">Date de début</TableHead>
                                <TableHead className="text-center">Date de fin</TableHead>
                                <TableHead className="text-center">Heure de debut</TableHead>
                                <TableHead className="text-center">Heure de fin</TableHead>
                                <TableHead className="text-center">Terrains</TableHead>
                                <TableHead className="text-center">Joueurs</TableHead>
                                <TableHead className="text-center">Statut</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.map((event) => {
                                const status = getEventStatus(event)
                                const playerCount = event.player_count || 0
                                return (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium text-center">
                                            {event.event_name}
                                        </TableCell>
                                        <TableCell className="text-center">{formatDate(event.start_date)}</TableCell>
                                        <TableCell className="text-center">{formatDate(event.end_date)}</TableCell>
                                        <TableCell className="text-center">{formatTime(event.start_time)}</TableCell>
                                        <TableCell className="text-center">{formatTime(event.end_time)}</TableCell>
                                        <TableCell className="text-center">{event.number_of_courts}</TableCell>
                                        <TableCell className="text-center">{playerCount}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={status.variant}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(event)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(event)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>

                <Button onClick={handleCreate} className="mt-8 self-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un événement
                </Button>
                </>
            )}

            {/* dialog de creation / edition / suppression */}
            <EventWizardDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                event={selectedEvent}
                onSuccess={handleSuccess}
            />

            {/* Dialog de suppression */}
            <DeleteEventDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                event={selectedEvent}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
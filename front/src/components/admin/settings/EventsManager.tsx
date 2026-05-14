import { EventsSkeleton } from "@/components/shared/skeletons/SettingsSkeleton"
import { useEvent } from "@/contexts/EventContext"
import type { Event, EventRound } from "@/types/event"
import type { ClubDefaults } from "./EventDialog"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusSignIcon, PencilEdit01Icon, Delete02Icon, Calendar03Icon } from "hugeicons-react"
import { EventWizardDialog } from "./EventWizardDialog"
import { DeleteEventDialog } from "./DeleteEventDialog"

interface EventsManagerProps {
    clubDefaults?: ClubDefaults
}

export function EventsManager({ clubDefaults }: EventsManagerProps) {
    const { events, loading, fetchEvents } = useEvent()
    const [dialogOpen, setDialogOpen] = useState<boolean>(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

    const getRoundStatus = (round: EventRound | undefined) => {
        switch (round?.status) {
            case "completed": return { label: "Terminé",  variant: "default"  as const }
            case "upcoming":  return { label: "À venir",  variant: "inactive" as const }
            default:          return { label: "En cours", variant: "active"   as const }
        }
    }

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })

    const formatTime = (t: string | undefined) => {
        if (!t) return null
        const m = t.match(/(\d{2}):(\d{2})/)
        return m ? `${m[1]}:${m[2]}` : t
    }

    const handleCreate = () => { setSelectedEvent(null); setDialogOpen(true) }
    const handleEdit   = (e: Event) => { setSelectedEvent(e); setDialogOpen(true) }
    const handleDelete = (e: Event) => { setSelectedEvent(e); setDeleteDialogOpen(true) }

    const handleSuccess = async () => {
        await fetchEvents()
        setDialogOpen(false)
        setDeleteDialogOpen(false)
        setSelectedEvent(null)
    }

    if (loading) return <EventsSkeleton />

    return (
        <div className="flex flex-col gap-4">

            {events.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-xl py-20">
                    <div className="text-center">
                        <Calendar03Icon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun événement</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Commencez par créer votre premier événement
                        </p>
                        <Button onClick={handleCreate} size="lg" className="mt-6">
                            <PlusSignIcon className="mr-2 h-4 w-4" />
                            Créer un événement
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {events.map((event) => {
                        const rounds = event.event_rounds ?? []

                        return (
                            <div key={event.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* En-tête : nom + statut + actions */}
                                {/* En-tête : nom + joueurs + actions */}
                                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
                                    <span className="font-semibold text-sm">{event.event_name}</span>
                                    <div className="flex items-center gap-1">
                                        <Button variant="icon" size="icon" className="border-0 h-7 w-7" onClick={() => handleEdit(event)}>
                                            <PencilEdit01Icon className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="icon" size="icon" className="border-0 h-7 w-7" onClick={() => handleDelete(event)}>
                                            <Delete02Icon className="h-3.5 w-3.5 text-red-500" />
                                        </Button>
                                    </div>
                                </div>

                                {/* En-têtes de colonnes */}
                                <div className="grid grid-cols-9 text-center divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
                                    {["Round", "Début", "Fin", "Clôture", "Heure déb.", "Heure fin", "Terrains", "Joueurs", "Statut"].map(label => (
                                        <div key={label} className="py-1 px-1">
                                            <span className="text-gray-400 uppercase tracking-wide" style={{ fontSize: "10px" }}>{label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Une ligne par round */}
                                {rounds.length === 0 ? (
                                    <div className="py-3 text-center text-xs text-gray-400">Aucun round configuré</div>
                                ) : (
                                    rounds.map((r) => {
                                        const s = getRoundStatus(r)
                                        return (
                                            <div key={r.id} className="grid grid-cols-9 text-xs text-center divide-x divide-gray-100 border-b border-gray-100 last:border-b-0">
                                                <div className="py-2 px-1 font-medium text-gray-700">Round {r.round_number}</div>
                                                <div className="py-2 px-1 text-gray-700">{r.start_date ? formatDate(r.start_date) : <span className="text-gray-300">—</span>}</div>
                                                <div className="py-2 px-1 text-gray-700">{r.end_date   ? formatDate(r.end_date)   : <span className="text-gray-300">—</span>}</div>
                                                <div className="py-2 px-1 text-gray-700">{r.deadline   ? formatDate(r.deadline)   : <span className="text-gray-300">—</span>}</div>
                                                <div className="py-2 px-1 text-gray-700">{formatTime(r.start_time) ?? <span className="text-gray-300">—</span>}</div>
                                                <div className="py-2 px-1 text-gray-700">{formatTime(r.end_time)   ?? <span className="text-gray-300">—</span>}</div>
                                                <div className="py-2 px-1 text-gray-700">{r.number_of_courts}</div>
                                                <div className="py-2 px-1 text-gray-700">{r.player_count ?? 0}</div>
                                                <div className="py-2 px-1 flex items-center justify-center">
                                                    <Badge variant={s.variant}>{s.label}</Badge>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )
                    })}

                    <Button onClick={handleCreate} variant="default" size="lg" className="w-[220px] mx-auto mt-4">
                        <PlusSignIcon size={20} />
                        Ajouter un événement
                    </Button>
                </>
            )}

            <EventWizardDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                event={selectedEvent}
                onSuccess={handleSuccess}
                clubDefaults={clubDefaults}
            />

            <DeleteEventDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                event={selectedEvent}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
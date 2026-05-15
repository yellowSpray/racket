import { EventsSkeleton } from "@/components/shared/skeletons/SettingsSkeleton"
import { useEvent } from "@/contexts/EventContext"
import { supabase } from "@/lib/supabaseClient"
import type { Event, EventRound } from "@/types/event"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { PlusSignIcon, PencilEdit01Icon, Delete02Icon, Calendar03Icon, Settings01Icon } from "hugeicons-react"
import { EventCreateWizardDialog } from "./EventCreateWizardDialog"
import { RoundWizardDialog } from "./RoundWizardDialog"

export function EventsManager() {
    const { events, loading, fetchEvents } = useEvent()

    // — wizard Event (création / édition paramètres event)
    const [eventDialogOpen, setEventDialogOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

    // — wizard Round (création / édition round)
    const [roundDialogOpen, setRoundDialogOpen] = useState(false)
    const [roundDialogEvent, setRoundDialogEvent] = useState<Event | null>(null)
    const [selectedRound, setSelectedRound] = useState<EventRound | null>(null)

    // — suppression round
    const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null)

    const getRoundStatus = (round: EventRound) => {
        switch (round.status) {
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

    const handleToggleAutoRenew = async (event: Event, value: boolean) => {
        await supabase.from("events").update({ auto_renew: value }).eq("id", event.id)
        await fetchEvents()
    }

    const handleDeleteRound = async (roundId: string) => {
        setDeletingRoundId(roundId)
        try {
            await supabase.from("event_rounds").delete().eq("id", roundId)
            await fetchEvents()
        } finally {
            setDeletingRoundId(null)
        }
    }

    // Ouvre le wizard Event (création ou édition paramètres)
    const openEventWizard = (event: Event | null) => {
        setSelectedEvent(event)
        setEventDialogOpen(true)
    }

    // Ouvre le wizard Round (création ou édition round)
    const openRoundWizard = (event: Event, round: EventRound | null) => {
        setRoundDialogEvent(event)
        setSelectedRound(round)
        setRoundDialogOpen(true)
    }

    const handleEventSuccess = async () => {
        await fetchEvents()
        setSelectedEvent(null)
    }

    const handleRoundSuccess = async () => {
        await fetchEvents()
        setSelectedRound(null)
        setRoundDialogEvent(null)
    }

    const handleDeleteSuccess = async () => {
        await fetchEvents()
        setEventDialogOpen(false)
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
                        <Button onClick={() => openEventWizard(null)} size="lg" className="mt-6">
                            <PlusSignIcon className="mr-2 h-4 w-4" />
                            Créer un événement
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {events.map((event) => {
                        const rounds = event.event_rounds ?? []
                        const nextRoundNumber = rounds.length > 0
                            ? Math.max(...rounds.map(r => r.round_number)) + 1
                            : 1

                        return (
                            <div key={event.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* En-tête event */}
                                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
                                    <button
                                        onClick={() => openEventWizard(event)}
                                        className="flex items-center gap-1.5 group"
                                        title="Paramètres de l'événement"
                                    >
                                        <span className="font-semibold text-sm">{event.event_name}</span>
                                        <Settings01Icon className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                    </button>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <span className="text-xs text-gray-500">Renouvellement auto</span>
                                        <Switch
                                            checked={event.auto_renew ?? false}
                                            onCheckedChange={(v) => handleToggleAutoRenew(event, v)}
                                        />
                                    </label>
                                </div>

                                {/* En-têtes colonnes rounds */}
                                <div className="grid grid-cols-10 text-center divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
                                    {["Série", "Début", "Fin", "Clôture", "Heure déb.", "Heure fin", "Terrains", "Joueurs", "Statut", ""].map(label => (
                                        <div key={label} className="py-1 px-1">
                                            <span className="text-gray-400 uppercase tracking-wide" style={{ fontSize: "10px" }}>{label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Bouton créer round → ouvre le wizard Round */}
                                <button
                                    onClick={() => openRoundWizard(event, null)}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs text-gray-400 border-b border-dashed border-gray-200 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                >
                                    <PlusSignIcon className="h-3.5 w-3.5" />
                                    Créer la Série {nextRoundNumber}
                                </button>

                                {/* Lignes rounds */}
                                {rounds.length === 0 ? (
                                    <div className="py-3 text-center text-xs text-gray-400">Aucun round configuré</div>
                                ) : (
                                    [...rounds].reverse().map((r) => {
                                        const s = getRoundStatus(r)
                                        return (
                                            <div key={r.id} className="grid grid-cols-10 text-xs text-center divide-x divide-gray-100 border-b border-gray-100 last:border-b-0">
                                                <div className="py-3 px-1 font-medium text-gray-700">Série {r.round_number}</div>
                                                <div className="py-3 px-1 text-gray-700">{r.start_date ? formatDate(r.start_date) : <span className="text-gray-300">—</span>}</div>
                                                <div className="py-3 px-1 text-gray-700">{r.end_date   ? formatDate(r.end_date)   : <span className="text-gray-300">—</span>}</div>
                                                <div className="py-3 px-1 text-gray-700">{r.deadline   ? formatDate(r.deadline)   : <span className="text-gray-300">—</span>}</div>
                                                <div className="py-3 px-1 text-gray-700">{formatTime(r.start_time) ?? <span className="text-gray-300">—</span>}</div>
                                                <div className="py-3 px-1 text-gray-700">{formatTime(r.end_time)   ?? <span className="text-gray-300">—</span>}</div>
                                                <div className="py-3 px-1 text-gray-700">{r.number_of_courts}</div>
                                                <div className="py-3 px-1 text-gray-700">{r.player_count ?? 0}</div>
                                                <div className="py-3 px-1 flex items-center justify-center">
                                                    <Badge variant={s.variant}>{s.label}</Badge>
                                                </div>
                                                <div className="py-3 px-1 flex items-center justify-center gap-1">
                                                    {/* Éditer ce round → wizard Round */}
                                                    <Button
                                                        variant="icon" size="icon" className="border-0 h-6 w-6"
                                                        onClick={() => openRoundWizard(event, r)}
                                                        title="Modifier le round"
                                                    >
                                                        <PencilEdit01Icon className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="icon" size="icon" className="border-0 h-6 w-6"
                                                        disabled={deletingRoundId === r.id}
                                                        onClick={() => handleDeleteRound(r.id)}
                                                    >
                                                        <Delete02Icon className="h-3 w-3 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )
                    })}

                    <Button onClick={() => openEventWizard(null)} variant="default" size="lg" className="w-[220px] mx-auto mt-4">
                        <PlusSignIcon size={20} />
                        Ajouter un événement
                    </Button>
                </>
            )}

            {/* Wizard Event (nom, calendrier, promotion, barème) */}
            <EventCreateWizardDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                event={selectedEvent}
                onSuccess={handleEventSuccess}
                onDelete={handleDeleteSuccess}
            />

            {/* Wizard Round (calendrier round, inscriptions, tableaux, matchs) */}
            {roundDialogEvent && (
                <RoundWizardDialog
                    open={roundDialogOpen}
                    onOpenChange={setRoundDialogOpen}
                    event={roundDialogEvent}
                    round={selectedRound}
                    onSuccess={handleRoundSuccess}
                />
            )}

        </div>
    )
}

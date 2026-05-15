import { EventsSkeleton } from "@/components/shared/skeletons/SettingsSkeleton"
import { useEvent } from "@/contexts/EventContext"
import { supabase } from "@/lib/supabaseClient"
import type { Event, EventRound } from "@/types/event"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { PlusSignIcon, PencilEdit01Icon, Delete02Icon, Calendar03Icon, Settings01Icon, DashedLine02Icon, UserGroupIcon, Clock01Icon } from "hugeicons-react"
import { EventCreateWizardDialog } from "./EventCreateWizardDialog"
import { RoundWizardDialog } from "./RoundWizardDialog"

// — Helpers purs

function getRoundStatus(round: EventRound) {
    switch (round.status) {
        case "completed": return { label: "Terminé",  variant: "default"  as const }
        case "upcoming":  return { label: "À venir",  variant: "inactive" as const }
        default:          return { label: "En cours", variant: "active"   as const }
    }
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatTime(t: string | undefined) {
    if (!t) return null
    const m = t.match(/(\d{2}):(\d{2})/)
    return m ? `${m[1]}:${m[2]}` : t
}

// — Sous-composant : timeline d'un round

const LINE = 20

function RoundTimeline({ round: r }: { round: EventRound }) {
    const hasDate = !!(r.start_date && r.end_date)

    const rMin     = r.start_date ? new Date(r.start_date).getTime() : 0
    const rMax     = r.deadline   ? new Date(r.deadline).getTime()
                   : r.end_date   ? new Date(r.end_date).getTime()   : 0
    const rSpan    = (rMax - rMin) || 86400000
    const toPct    = (d: string) => ((new Date(d).getTime() - rMin) / rSpan) * 100
    const todayPct = ((Date.now() - rMin) / rSpan) * 100

    const startPct    = r.start_date ? toPct(r.start_date) : null
    const endPct      = r.end_date   ? toPct(r.end_date)   : null
    const deadlinePct = r.deadline   ? toPct(r.deadline)   : null
    const showToday   = hasDate && todayPct >= 0 && todayPct <= 100

    const greenEndPct   = endPct !== null ? Math.min(endPct, todayPct) : todayPct
    const greenWidthPct = startPct !== null ? Math.max(0, greenEndPct - startPct) : 0

    if (!hasDate) {
        return (
            <div className="col-span-4 relative mx-20" style={{ height: 52 }}>
                <div className="absolute inset-0 flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400 shrink-0">Dates non configurées</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>
            </div>
        )
    }

    return (
        <div className="col-span-4 relative mx-20" style={{ height: 52 }}>
            {/* Ligne de fond */}
            <div className="absolute left-0 right-0 h-px bg-gray-200" style={{ top: LINE }} />

            {/* Segment vert : début → aujourd'hui */}
            {startPct !== null && greenWidthPct > 0 && (
                <div
                    className="absolute h-0.5 bg-emerald-400"
                    style={{ top: LINE - 0.5, left: `${startPct}%`, width: `${greenWidthPct}%` }}
                />
            )}

            {/* Dot + date début */}
            {startPct !== null && (<>
                <div
                    className="absolute w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                    style={{ top: LINE - 6, left: `${startPct}%`, transform: "translateX(-50%)" }}
                />
                <span
                    className="absolute text-[9px] text-gray-500 whitespace-nowrap"
                    style={{ top: LINE + 9, left: `${startPct}%`, transform: "translateX(-50%)" }}
                >
                    {formatDate(r.start_date!)}
                </span>
            </>)}

            {/* Aujourd'hui */}
            {showToday && (<>
                <span
                    className="absolute text-[9px] font-bold text-emerald-600 uppercase whitespace-nowrap"
                    style={{ top: 2, left: `${todayPct}%`, transform: "translateX(-50%)" }}
                >
                    Aujourd'hui
                </span>
                <div
                    className="absolute w-3 h-3 rounded-full bg-emerald-600 border-2 border-white shadow-sm"
                    style={{ top: LINE - 6, left: `${todayPct}%`, transform: "translateX(-50%)" }}
                />
            </>)}

            {/* Dot + date fin */}
            {endPct !== null && (<>
                <div
                    className="absolute w-2.5 h-2.5 rounded-full bg-gray-300 border border-gray-400"
                    style={{ top: LINE - 5, left: `${endPct}%`, transform: "translateX(-50%)" }}
                />
                <span
                    className="absolute text-[9px] text-gray-500 whitespace-nowrap"
                    style={{ top: LINE + 9, left: `${endPct}%`, transform: "translateX(-50%)" }}
                >
                    {formatDate(r.end_date!)}
                </span>
            </>)}

            {/* Clôture */}
            {deadlinePct !== null && (<>
                <span
                    className="absolute text-[9px] font-semibold text-red-500 uppercase whitespace-nowrap"
                    style={{ top: 2, left: `${deadlinePct}%`, transform: "translateX(-50%)" }}
                >
                    Clôture
                </span>
                <div
                    className="absolute w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-white shadow-sm"
                    style={{ top: LINE - 5, left: `${deadlinePct}%`, transform: "translateX(-50%)" }}
                />
                <span
                    className="absolute text-[9px] text-red-500 whitespace-nowrap"
                    style={{ top: LINE + 9, left: `${deadlinePct}%`, transform: "translateX(-50%)" }}
                >
                    {formatDate(r.deadline!)}
                </span>
            </>)}
        </div>
    )
}

// — Sous-composant : ligne d'un round

interface RoundRowProps {
    round: EventRound
    event: Event
    deletingRoundId: string | null
    onEdit: () => void
    onDelete: () => void
}

function RoundRow({ round: r, deletingRoundId, onEdit, onDelete }: RoundRowProps) {
    const s = getRoundStatus(r)

    return (
        <div className="grid grid-cols-10 items-center py-5">
            {/* Série + statut */}
            <div className="flex flex-col items-center gap-0.5 px-2">
                <span className="text-xs font-medium text-gray-700">Série {r.round_number}</span>
                <Badge variant={s.variant}>{s.label}</Badge>
            </div>

            {/* Timeline */}
            <RoundTimeline round={r} />

            {/* Heures */}
            <div className="flex items-center justify-center gap-1">
                <Clock01Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500">{formatTime(r.start_time) ?? <span className="text-gray-300">—</span>}</span>
                <span className="text-xs text-gray-400">-</span>
                <span className="text-xs text-gray-400">{formatTime(r.end_time) ?? <span className="text-gray-300">—</span>}</span>
            </div>

            {/* Terrains */}
            <div className="flex items-center justify-center gap-1">
                <DashedLine02Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400">Terrains</span>
                <span className="text-xs text-gray-700 font-medium">{r.number_of_courts ?? <span className="text-gray-300">—</span>}</span>
            </div>

            {/* Joueurs */}
            <div className="flex items-center justify-center gap-1">
                <UserGroupIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400">Joueurs</span>
                <span className="text-xs text-gray-700 font-medium">{r.player_count ?? 0}</span>
            </div>

            {/* Nouveaux / Désinscrits */}
            <div className="flex items-center justify-center gap-1.5">
                {(r.new_player_count ?? 0) > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">+{r.new_player_count}</span>
                )}
                {(r.removed_player_count ?? 0) > 0 && (
                    <span className="text-xs text-red-500 font-medium">-{r.removed_player_count}</span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-1">
                <Button
                    variant="icon" size="icon" className="border-0 h-6 w-6"
                    onClick={onEdit}
                    title="Modifier le round"
                >
                    <PencilEdit01Icon className="h-3 w-3" />
                </Button>
                <Button
                    variant="icon" size="icon" className="border-0 h-6 w-6"
                    disabled={deletingRoundId === r.id}
                    onClick={onDelete}
                >
                    <Delete02Icon className="h-3 w-3 text-red-500" />
                </Button>
            </div>
        </div>
    )
}

// — Composant principal

export function EventsManager() {
    const { events, loading, fetchEvents } = useEvent()

    const [eventDialogOpen, setEventDialogOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

    const [roundDialogOpen, setRoundDialogOpen] = useState(false)
    const [roundDialogEvent, setRoundDialogEvent] = useState<Event | null>(null)
    const [selectedRound, setSelectedRound] = useState<EventRound | null>(null)

    const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null)

    const openEventWizard = (event: Event | null) => {
        setSelectedEvent(event)
        setEventDialogOpen(true)
    }

    const openRoundWizard = (event: Event, round: EventRound | null) => {
        setRoundDialogEvent(event)
        setSelectedRound(round)
        setRoundDialogOpen(true)
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
                                <div className="grid grid-cols-10 bg-gray-100 border-b border-gray-200">
                                    <button
                                        onClick={() => openEventWizard(event)}
                                        className="flex items-center justify-center gap-1.5 px-2 py-2 group"
                                        title="Paramètres de l'événement"
                                    >
                                        <span className="font-semibold text-sm truncate">{event.event_name}</span>
                                        <Settings01Icon className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                    </button>
                                    <div className="col-span-8" />
                                    <label className="flex items-center justify-center gap-1.5 py-2 cursor-pointer select-none">
                                        <span className="text-xs text-gray-500">Renouvellement auto</span>
                                        <Switch
                                            checked={event.auto_renew ?? false}
                                            onCheckedChange={(v) => handleToggleAutoRenew(event, v)}
                                        />
                                    </label>
                                </div>

                                {/* Rounds */}
                                {rounds.length === 0 ? (
                                    <div className="py-3 text-center text-xs text-gray-400">Aucun round configuré</div>
                                ) : (
                                    <div className="flex flex-col divide-y divide-gray-200">
                                        {[...rounds].reverse().map((r) => (
                                            <RoundRow
                                                key={r.id}
                                                round={r}
                                                event={event}
                                                deletingRoundId={deletingRoundId}
                                                onEdit={() => openRoundWizard(event, r)}
                                                onDelete={() => handleDeleteRound(r.id)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Créer une nouvelle série */}
                                <button
                                    onClick={() => openRoundWizard(event, null)}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs text-gray-400 border-t border-dashed border-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                >
                                    <PlusSignIcon className="h-3.5 w-3.5" />
                                    Créer la Série {nextRoundNumber}
                                </button>
                            </div>
                        )
                    })}

                    <Button onClick={() => openEventWizard(null)} variant="default" size="lg" className="w-[220px] mx-auto mt-4">
                        <PlusSignIcon size={20} />
                        Ajouter un événement
                    </Button>
                </>
            )}

            <EventCreateWizardDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                event={selectedEvent}
                onSuccess={handleEventSuccess}
                onDelete={handleDeleteSuccess}
            />

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

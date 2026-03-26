import type { Event } from "@/types/event"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useMatches } from "@/hooks/useMatches"
import { totalMatchCount, totalSlotCount, calculateTimeSlots, calculateDates } from "@/lib/matchScheduler"
import { analyzeUnplaced } from "@/lib/schedulerSuggestions"
import { intervalToMinutes } from "@/lib/utils"
import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { MatchScheduleGrid } from "@/components/admin/matches/MatchScheduleGrid"
import { UnplacedMatchesPanel } from "@/components/admin/matches/UnplacedMatchesPanel"
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
import { SparklesIcon, Delete02Icon, Calendar03Icon } from "hugeicons-react"

interface WizardStepMatchesProps {
    event: Event
    groups: Group[]
    matches: Match[]
    onMatchesChanged: (matches: Match[]) => void
    onPrevious: () => void
    onFinish: () => void
}

export function WizardStepMatches({ event, groups, matches, onMatchesChanged, onPrevious, onFinish }: WizardStepMatchesProps) {
    const { generateMatches, deleteMatchesByEvent, unplacedMatches, playerConstraints, updateMatchSchedule } = useMatches()
    const [generating, setGenerating] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<"generate" | "delete">("generate")
    const [error, setError] = useState<string | null>(null)

    const matchCount = totalMatchCount(groups)
    const durationMin = intervalToMinutes(event.estimated_match_duration)
    const dates = calculateDates(event.start_date, event.end_date, event.playing_dates)
    const timeSlots = calculateTimeSlots(
        event.start_time || "19:00",
        event.end_time || "23:00",
        durationMin
    )
    const slotTotal = totalSlotCount(dates.length, timeSlots.length, event.number_of_courts)

    // Diagnostic des matchs non-placés
    const diagnostic = useMemo(() => {
        if (unplacedMatches.length === 0) return null
        return analyzeUnplaced(unplacedMatches, {
            totalMatches: matchCount,
            placedMatches: matches.length,
            dates,
            timeSlotsPerDay: timeSlots.length,
            courts: event.number_of_courts,
        })
    }, [unplacedMatches, matchCount, matches.length, dates, timeSlots.length, event.number_of_courts])

    // DnD handler
    const handleMatchDrop = useCallback(async (matchId: string, updates: { match_date: string; match_time: string; court_number: string }) => {
        const success = await updateMatchSchedule(matchId, updates)
        if (success) {
            // Update local matches list
            onMatchesChanged(matches.map(m => m.id === matchId ? { ...m, ...updates } : m))
        }
    }, [updateMatchSchedule, onMatchesChanged, matches])

    const hasMatches = matches.length > 0
    const hasPlayers = groups.some(g => (g.players || []).length >= 2)

    // Conditions pour la génération auto
    const missingRequirements: string[] = []
    if (!hasPlayers) missingRequirements.push("Au moins 2 joueurs dans un groupe")
    if (dates.length === 0) missingRequirements.push("Dates de jeu configurées")
    if (timeSlots.length === 0) missingRequirements.push("Créneaux horaires (heure début/fin + durée match)")
    if (!event.number_of_courts || event.number_of_courts < 1) missingRequirements.push("Au moins 1 terrain")
    if (slotTotal < matchCount && slotTotal > 0 && matchCount > 0) missingRequirements.push(`Pas assez de créneaux : ${slotTotal} disponibles pour ${matchCount} matchs`)
    const canGenerate = missingRequirements.length === 0

    const handleGenerate = async () => {
        if (hasMatches) {
            setConfirmAction("generate")
            setConfirmOpen(true)
            return
        }
        await doGenerate()
    }

    const [warning, setWarning] = useState<string | null>(null)

    const doGenerate = async () => {
        setGenerating(true)
        setError(null)
        setWarning(null)
        try {
            if (hasMatches) {
                await deleteMatchesByEvent(event.id)
            }
            const result = await generateMatches(event, groups)

            if (!result) {
                setError("Impossible de générer les matchs. Vérifiez la configuration des créneaux et terrains.")
                return
            }

            if (result.placed < result.total) {
                setWarning(
                    `${result.placed}/${result.total} matchs placés. ` +
                    `${result.total - result.placed} match(s) sans créneau. Ajoutez des dates ou des terrains.`
                )
            }

            // Re-fetch les matchs pour obtenir les donnees completes
            const updatedMatches = await fetchMatchesForEvent(event.id)
            onMatchesChanged(updatedMatches)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de la génération")
        } finally {
            setGenerating(false)
        }
    }

    const handleDelete = () => {
        setConfirmAction("delete")
        setConfirmOpen(true)
    }

    const doDelete = async () => {
        setGenerating(true)
        setError(null)
        try {
            await deleteMatchesByEvent(event.id)
            onMatchesChanged([])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de la suppression")
        } finally {
            setGenerating(false)
        }
    }

    const handleConfirm = async () => {
        setConfirmOpen(false)
        if (confirmAction === "generate") {
            await doGenerate()
        } else {
            await doDelete()
        }
    }

    return (
        <div className="py-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {warning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded mb-4">
                    ⚠ {warning}
                </div>
            )}

            {!canGenerate ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Calendar03Icon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">Génération impossible</h3>
                    <p className="text-gray-500 mt-2 mb-4">
                        Les conditions suivantes ne sont pas remplies :
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1">
                        {missingRequirements.map((req, i) => (
                            <li key={i} className="flex items-center justify-center gap-2">
                                <span className="text-red-400">✕</span> {req}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : !hasMatches ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Calendar03Icon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun match généré</h3>
                    <p className="text-gray-500 mt-2">
                        {matchCount} matchs à programmer sur {slotTotal} créneaux disponibles
                        ({dates.length} jour{dates.length > 1 ? "s" : ""} × {timeSlots.length} créneaux × {event.number_of_courts} terrain{event.number_of_courts > 1 ? "s" : ""})
                    </p>
                    <Button className="mt-4" onClick={handleGenerate} disabled={generating}>
                        <SparklesIcon className="mr-2 h-4 w-4" />
                        {generating ? "Génération..." : "Générer les matchs"}
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {matches.length} match{matches.length > 1 ? "s" : ""} généré{matches.length > 1 ? "s" : ""}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleDelete} disabled={generating}>
                                <Delete02Icon className="mr-2 h-4 w-4" />
                                Supprimer
                            </Button>
                            <Button size="sm" onClick={handleGenerate} disabled={generating}>
                                <SparklesIcon className="mr-2 h-4 w-4" />
                                {generating ? "Génération..." : "Régénérer"}
                            </Button>
                        </div>
                    </div>

                    {/* Panneau conflits / matchs non-placés */}
                    {diagnostic && <UnplacedMatchesPanel diagnostic={diagnostic} />}

                    <div className="max-h-[50vh] overflow-y-auto">
                        <MatchScheduleGrid matches={matches} event={event} onMatchDrop={handleMatchDrop} playerConstraints={playerConstraints} />
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
                <Button type="button" variant="outline" onClick={onPrevious}>
                    Précédent
                </Button>
                <Button type="button" onClick={onFinish}>
                    Terminer
                </Button>
            </div>

            {/* Dialog de confirmation */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction === "generate" ? "Régénérer les matchs ?" : "Supprimer les matchs ?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction === "generate"
                                ? "Les matchs existants seront supprimés et remplacés par un nouveau planning."
                                : "Tous les matchs de cet événement seront supprimés. Cette action est irréversible."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>
                            {confirmAction === "generate" ? "Régénérer" : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// Helper pour re-fetch les matchs apres generation
import { supabase } from "@/lib/supabaseClient"

async function fetchMatchesForEvent(eventId: string): Promise<Match[]> {
    // D'abord recuperer les group IDs
    const { data: groupsData } = await supabase
        .from("groups")
        .select("id")
        .eq("event_id", eventId)

    if (!groupsData || groupsData.length === 0) return []

    const groupIds = groupsData.map(g => g.id)

    const { data: matchesData } = await supabase
        .from("matches")
        .select(`
            *,
            player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
            player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
            group:groups(id, group_name, event_id)
        `)
        .in("group_id", groupIds)
        .order("match_date")
        .order("match_time")

    return matchesData || []
}

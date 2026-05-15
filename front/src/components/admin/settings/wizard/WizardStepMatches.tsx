import type { Event, EventRound } from "@/types/event"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useMatches } from "@/hooks/useMatches"
import { totalMatchCount, totalSlotCount, calculateTimeSlots, calculateDates } from "@/lib/matchScheduler"
import { analyzeUnplaced } from "@/lib/schedulerSuggestions"
import { intervalToMinutes } from "@/lib/utils"
import { useCallback, useMemo, useState } from "react"
import { useErrorHandler } from "@/hooks/useErrorHandler"
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
import { SparklesIcon, Delete02Icon, Calendar03Icon, ArrowLeft01Icon, Tick02Icon } from "hugeicons-react"

interface WizardStepMatchesProps {
    event: Event
    round: EventRound
    groups: Group[]
    matches: Match[]
    onMatchesChanged: (matches: Match[]) => void
    onPrevious: () => void
    onFinish: () => void
}

export function WizardStepMatches({ event, round, groups, matches, onMatchesChanged, onPrevious, onFinish }: WizardStepMatchesProps) {
    const { generateMatches, deleteMatchesByRound, unplacedMatches, playerConstraints, updateMatchSchedule } = useMatches()
    const [generating, setGenerating] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<"generate" | "delete">("generate")
    const { handleError, clearError } = useErrorHandler()

    const matchCount = totalMatchCount(groups)
    const durationMin = intervalToMinutes(round.estimated_match_duration)
    const dates = calculateDates(round.start_date, round.end_date, round.playing_dates)
    const timeSlots = calculateTimeSlots(
        round.start_time || "19:00",
        round.end_time || "23:00",
        durationMin
    )
    const slotTotal = totalSlotCount(dates.length, timeSlots.length, round.number_of_courts)

    // Diagnostic des matchs non-placés
    const diagnostic = useMemo(() => {
        if (unplacedMatches.length === 0) return null
        return analyzeUnplaced(unplacedMatches, {
            totalMatches: matchCount,
            placedMatches: matches.length,
            dates,
            timeSlotsPerDay: timeSlots.length,
            courts: round.number_of_courts,
        })
    }, [unplacedMatches, matchCount, matches.length, dates, timeSlots.length, round.number_of_courts])

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
    if (!round.number_of_courts || round.number_of_courts < 1) missingRequirements.push("Au moins 1 terrain")
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
        clearError()
        setWarning(null)
        try {
            if (hasMatches) {
                await deleteMatchesByRound(round.id)
            }

            // — Log : résumé des tableaux en entrée
            console.group("🎾 Génération des matchs — entrée")
            groups.forEach(g => {
                const n = (g.players || []).length
                const pairs = (n * (n - 1)) / 2
                console.log(`  Tableau "${g.group_name}" : ${n} joueurs → ${pairs} paires round-robin`)
            })
            const totalPairs = groups.reduce((s, g) => {
                const n = (g.players || []).length
                return s + (n * (n - 1)) / 2
            }, 0)
            console.log(`  Total paires (toutes dates confondues estimé par l'algo) : à confirmer`)
            console.log(`  Total paires round-robin uniques : ${totalPairs}`)
            console.groupEnd()

            const result = await generateMatches(round, event, groups)

            if (!result) {
                handleError(new Error("Impossible de générer les matchs. Vérifiez la configuration des créneaux et terrains."))
                return
            }

            // — Log : résultat de l'algorithme
            console.group(`🎾 Génération des matchs — résultat algo`)
            console.log(`  Total pairings calculés : ${result.total}`)
            console.log(`  Placés                  : ${result.placed} / ${result.total}`)
            console.log(`  Non-placés              : ${result.unplaced.length}`)
            if (result.unplaced.length > 0) {
                console.group("  ❌ Matchs non-placés")
                result.unplaced.forEach(u => {
                    console.log(`    ${u.pairing.player1Name} vs ${u.pairing.player2Name}  |  Tableau : ${u.pairing.groupName}  |  Date : ${u.date}`)
                })
                console.groupEnd()
            } else {
                console.log("  ✅ Tous les matchs ont été placés")
            }
            console.groupEnd()

            if (result.placed < result.total) {
                setWarning(
                    `${result.placed}/${result.total} matchs placés. ` +
                    `${result.total - result.placed} match(s) sans créneau. Ajoutez des dates ou des terrains.`
                )
            }

            // Re-fetch les matchs pour obtenir les donnees completes
            const updatedMatches = await fetchMatchesForRound(round.id)
            onMatchesChanged(updatedMatches)

            // — Log : vérification base de données
            console.group("🎾 Génération des matchs — vérification BDD")
            console.log(`  Matchs en base : ${updatedMatches.length} / ${result.total} attendus`)

            const matchesByGroup = new Map<string, typeof updatedMatches>()
            for (const m of updatedMatches) {
                const key = m.group?.group_name ?? "Inconnu"
                if (!matchesByGroup.has(key)) matchesByGroup.set(key, [])
                matchesByGroup.get(key)!.push(m)
            }

            groups.forEach(g => {
                const n = (g.players || []).length
                const dbCount = matchesByGroup.get(g.group_name)?.length ?? 0
                const pairs = (n * (n - 1)) / 2
                const ok = dbCount > 0
                console.log(`  ${ok ? "✅" : "⚠️"} Tableau "${g.group_name}" : ${dbCount} matchs en BDD  (${pairs} paires round-robin uniques)`)
            })

            const missing = groups.filter(g => !(matchesByGroup.get(g.group_name)?.length))
            if (missing.length > 0) {
                console.warn(`  ⚠️ Tableaux sans aucun match en BDD : ${missing.map(g => g.group_name).join(", ")}`)
            }
            console.groupEnd()

        } catch (err) {
            handleError(err)
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
        clearError()
        try {
            await deleteMatchesByRound(round.id)
            onMatchesChanged([])
        } catch (err) {
            handleError(err)
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
                        ({dates.length} jour{dates.length > 1 ? "s" : ""} × {timeSlots.length} créneaux × {round.number_of_courts} terrain{round.number_of_courts > 1 ? "s" : ""})
                    </p>
                    <Button className="mt-4" size="lg" onClick={handleGenerate} disabled={generating}>
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
                                <Delete02Icon className="h-4 w-4" />
                                Supprimer
                            </Button>
                            <Button size="sm" onClick={handleGenerate} disabled={generating}>
                                <SparklesIcon className="h-4 w-4" />
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
                <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                    <ArrowLeft01Icon className="h-4 w-4" />
                    Précédent
                </Button>
                <Button type="button" size="lg" onClick={onFinish}>
                    <Tick02Icon className="h-4 w-4" />
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

async function fetchMatchesForRound(roundId: string): Promise<Match[]> {
    const { data: groupsData } = await supabase
        .from("groups")
        .select("id")
        .eq("round_id", roundId)

    if (!groupsData || groupsData.length === 0) return []

    const groupIds = groupsData.map(g => g.id)

    const { data: matchesData } = await supabase
        .from("matches")
        .select(`
            *,
            player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
            player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
            group:groups(id, group_name, round_id)
        `)
        .in("group_id", groupIds)
        .order("match_date")
        .order("match_time")

    return matchesData || []
}

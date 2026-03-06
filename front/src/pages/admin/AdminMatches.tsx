import { EventSelector } from "@/components/admin/settings/EventSelector"
import { MatchScheduleGrid } from "@/components/admin/matches/MatchScheduleGrid"
import { MatchListView } from "@/components/admin/matches/MatchListView"
import { MatchSkeleton } from "@/components/shared/skeletons/MatchSkeleton"
import { useEvent } from "@/contexts/EventContext"
import { usePlayers } from "@/contexts/PlayersContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { CalendarDays, Settings, Pencil, Save, X, List, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { totalMatchCount, totalSlotCount, calculateTimeSlots, calculateDates } from "@/lib/matchScheduler"
import { intervalToMinutes } from "@/lib/utils"
import { parseScore } from "@/lib/rankingEngine"
import { matchResultSchema } from "@/lib/schemas/matchResult.schema"

export function AdminMatches() {

    const { currentEvent } = useEvent()
    const { players } = usePlayers()
    const { groups, fetchGroupsByEvent } = useGroups()
    const { matches, loading, error, fetchMatchesByEvent, updateMatchResults } = useMatches()
    const navigate = useNavigate()

    // Mode vue
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

    // Mode édition des scores
    const [editMode, setEditMode] = useState(false)
    const [pendingScores, setPendingScores] = useState<Map<string, string>>(new Map())
    const [saving, setSaving] = useState(false)
    const [scoreErrors, setScoreErrors] = useState<Map<string, string>>(new Map())


    useEffect(() => {
        if (currentEvent) {
            fetchGroupsByEvent(currentEvent.id)
            fetchMatchesByEvent(currentEvent.id)
        }
    }, [currentEvent, fetchGroupsByEvent, fetchMatchesByEvent])

    // --- Score editing ---

    const handleEnterEditMode = () => {
        // Pré-remplir avec les scores existants
        const initial = new Map<string, string>()
        for (const match of matches) {
            if (match.score) {
                initial.set(match.id, match.score)
            }
        }
        setPendingScores(initial)
        setScoreErrors(new Map())
        setEditMode(true)
    }

    const handleCancelEditMode = () => {
        setEditMode(false)
        setPendingScores(new Map())
        setScoreErrors(new Map())
    }

    const handleScoreChange = useCallback((matchId: string, value: string) => {
        setPendingScores(prev => {
            const next = new Map(prev)
            if (value) {
                next.set(matchId, value)
            } else {
                next.delete(matchId)
            }
            return next
        })
        // Clear error for this match
        setScoreErrors(prev => {
            if (!prev.has(matchId)) return prev
            const next = new Map(prev)
            next.delete(matchId)
            return next
        })
    }, [])

    const handleSaveScores = async () => {
        // Valider et préparer les résultats
        const errors = new Map<string, string>()
        const results: { matchId: string; winnerId: string | null; score: string }[] = []

        for (const [matchId, score] of pendingScores) {
            // Trouver le match original pour voir si le score a changé
            const match = matches.find(m => m.id === matchId)
            if (!match || match.score === score) continue

            // Ignorer les scores incomplets (un seul select rempli)
            if (!score || score === "-") continue

            // Valider le format
            const validation = matchResultSchema.safeParse({ score })
            if (!validation.success) {
                errors.set(matchId, validation.error.issues[0].message)
                continue
            }

            // Déterminer le vainqueur
            if (score === "WO") {
                // Pour WO, on garde le winner_id existant ou on laisse null pour l'instant
                // TODO: gérer le choix du gagnant pour WO
                results.push({ matchId, winnerId: match.winner_id, score })
            } else {
                const parsed = parseScore(score, match.player1_id, match.player2_id)
                results.push({
                    matchId,
                    winnerId: parsed?.winnerId ?? null,
                    score,
                })
            }
        }

        if (errors.size > 0) {
            setScoreErrors(errors)
            return
        }

        if (results.length === 0) {
            setEditMode(false)
            return
        }

        setSaving(true)
        const success = await updateMatchResults(results)
        setSaving(false)

        if (success) {
            setEditMode(false)
            setPendingScores(new Map())
            setScoreErrors(new Map())
        }
    }

    // Calculs pour l'info
    const matchCount = totalMatchCount(groups)
    const slotInfo = useMemo(() => {
        if (!currentEvent) return null
        const durationMin = intervalToMinutes(currentEvent.estimated_match_duration)
        const dates = calculateDates(currentEvent.start_date, currentEvent.end_date, currentEvent.playing_dates)
        const timeSlots = calculateTimeSlots(
            currentEvent.start_time || "19:00",
            currentEvent.end_time || "23:00",
            durationMin
        )
        return {
            total: totalSlotCount(dates.length, timeSlots.length, currentEvent.number_of_courts),
            datesCount: dates.length,
            slotsPerDay: timeSlots.length,
            courtsCount: currentEvent.number_of_courts,
        }
    }, [currentEvent])

    if (loading || saving) {
        return <MatchSkeleton />
    }

    if (!currentEvent) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold">Matchs</h3>
                        <EventSelector />
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
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}>
                            {viewMode === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                        </Button>
                    )}
                    {editMode ? (
                        <>
                            <Button variant="outline" size="sm" onClick={handleCancelEditMode}>
                                <X className="mr-2 h-4 w-4" />
                                Annuler
                            </Button>
                            <Button size="sm" onClick={handleSaveScores}>
                                <Save className="mr-2 h-4 w-4" />
                                Enregistrer tout
                            </Button>
                        </>
                    ) : (
                        <>
                            {hasMatches && (
                                <Button size="icon" className="h-8 w-8" onClick={handleEnterEditMode}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Erreur */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Erreurs de score */}
            {scoreErrors.size > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                    {scoreErrors.size} score(s) invalide(s). Corrigez les erreurs avant d'enregistrer.
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
                        ({slotInfo?.datesCount} jour{(slotInfo?.datesCount || 0) > 1 ? 's' : ''} × {slotInfo?.slotsPerDay} créneaux × {slotInfo?.courtsCount} terrain{(slotInfo?.courtsCount || 0) > 1 ? 's' : ''})
                    </p>
                    <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    {viewMode === "grid" ? (
                        <MatchScheduleGrid
                            matches={matches}
                            event={currentEvent}
                            editMode={editMode}
                            pendingScores={pendingScores}
                            onScoreChange={handleScoreChange}
                        />
                    ) : (
                        <MatchListView
                            matches={matches}
                            players={players}
                            editMode={editMode}
                            pendingScores={pendingScores}
                            onScoreChange={handleScoreChange}
                        />
                    )}
                </div>
            )}

        </div>
    )
}

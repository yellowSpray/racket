import { EventSelector } from "@/components/admin/settings/EventSelector"
import { MatchScheduleGrid } from "@/components/admin/matches/MatchScheduleGrid"
import { MatchListView } from "@/components/admin/matches/MatchListView"
import { MatchSkeleton } from "@/components/shared/skeletons/MatchSkeleton"
import { useEvent } from "@/contexts/EventContext"
import { usePlayers } from "@/contexts/PlayersContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useHeaderSlot, useHeaderActions } from "@/contexts/HeaderSlotContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Calendar03Icon, Settings01Icon, PencilEdit01Icon, FloppyDiskIcon, Cancel01Icon, ListViewIcon, GridViewIcon, Search01Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { totalMatchCount, totalSlotCount, calculateTimeSlots, calculateDates } from "@/lib/matchScheduler"
import { intervalToMinutes } from "@/lib/utils"
import { parseScore } from "@/lib/rankingEngine"
import { matchResultSchema } from "@/lib/schemas/matchResult.schema"

export function AdminMatches() {

    const { currentEvent, currentRound } = useEvent()
    const { players } = usePlayers()
    const { groups, fetchGroupsByRound } = useGroups()
    const { matches, loading, error, fetchMatchesByRound, updateMatchResults } = useMatches()
    const navigate = useNavigate()

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [searchQuery, setSearchQuery] = useState("")
    const [editMode, setEditMode] = useState(false)
    const [pendingScores, setPendingScores] = useState<Map<string, string>>(new Map())
    const [saving, setSaving] = useState(false)
    const [scoreErrors, setScoreErrors] = useState<Map<string, string>>(new Map())

    useEffect(() => {
        if (currentRound) {
            fetchGroupsByRound(currentRound.id)
            fetchMatchesByRound(currentRound.id)
        }
    }, [currentRound, fetchGroupsByRound, fetchMatchesByRound])

    const playerAbsences = useMemo(() => {
        const map = new Map<string, string[]>()
        for (const p of players) {
            if (p.unavailable.length > 0) map.set(p.id, p.unavailable)
        }
        return map
    }, [players])

    const handleEnterEditMode = useCallback(() => {
        const initial = new Map<string, string>()
        for (const match of matches) {
            if (match.score) {
                initial.set(match.id, match.score)
            } else {
                const p1Absent = playerAbsences.get(match.player1_id)?.includes(match.match_date)
                const p2Absent = playerAbsences.get(match.player2_id)?.includes(match.match_date)
                if (p1Absent && !p2Absent) initial.set(match.id, "ABS-0")
                else if (p2Absent && !p1Absent) initial.set(match.id, "0-ABS")
            }
        }
        setPendingScores(initial)
        setScoreErrors(new Map())
        setEditMode(true)
    }, [matches, playerAbsences])

    const handleCancelEditMode = useCallback(() => {
        setEditMode(false)
        setPendingScores(new Map())
        setScoreErrors(new Map())
    }, [])

    const handleScoreChange = useCallback((matchId: string, value: string) => {
        setPendingScores(prev => {
            const next = new Map(prev)
            if (value) next.set(matchId, value)
            else next.delete(matchId)
            return next
        })
        setScoreErrors(prev => {
            if (!prev.has(matchId)) return prev
            const next = new Map(prev)
            next.delete(matchId)
            return next
        })
    }, [])

    const handleSaveScores = useCallback(async () => {
        const errors = new Map<string, string>()
        const results: { matchId: string; winnerId: string | null; score: string }[] = []

        for (const [matchId, score] of pendingScores) {
            const match = matches.find(m => m.id === matchId)
            if (!match || match.score === score) continue
            if (!score || score === "-") continue

            const validation = matchResultSchema.safeParse({ score })
            if (!validation.success) {
                errors.set(matchId, validation.error.issues[0].message)
                continue
            }

            if (score === "WO") {
                results.push({ matchId, winnerId: match.winner_id, score })
            } else {
                const parsed = parseScore(score, match.player1_id, match.player2_id)
                results.push({ matchId, winnerId: parsed?.winnerId ?? null, score })
            }
        }

        if (errors.size > 0) { setScoreErrors(errors); return }
        if (results.length === 0) { setEditMode(false); return }

        setSaving(true)
        const success = await updateMatchResults(results)
        setSaving(false)

        if (success) {
            setEditMode(false)
            setPendingScores(new Map())
            setScoreErrors(new Map())
        }
    }, [pendingScores, matches, updateMatchResults])

    const matchCount = totalMatchCount(groups)
    const slotInfo = useMemo(() => {
        if (!currentEvent) return null
        if (!currentRound) return { total: 0, placed: 0 }
        const durationMin = intervalToMinutes(currentRound.estimated_match_duration)
        const dates = calculateDates(currentRound.start_date, currentRound.end_date, currentRound.playing_dates)
        const timeSlots = calculateTimeSlots(
            currentRound.start_time || "19:00",
            currentRound.end_time || "23:00",
            durationMin
        )
        return {
            total: totalSlotCount(dates.length, timeSlots.length, currentRound.number_of_courts),
            datesCount: dates.length,
            slotsPerDay: timeSlots.length,
            courtsCount: currentRound.number_of_courts,
        }
    }, [currentEvent])

    const hasGroups = groups.length > 0
    const hasPlayers = groups.some(g => (g.players || []).length >= 2)
    const hasMatches = matches.length > 0

    const headerPortal = useHeaderSlot(
        <>
            <h3 className="text-lg font-semibold">Matchs</h3>
            <EventSelector />
            {hasMatches && viewMode === "list" && (
                <div className="relative flex-1 max-w-sm">
                    <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un joueur..."
                        className="pl-9 pr-9 rounded-full h-10"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            ×
                        </button>
                    )}
                </div>
            )}
        </>
    )

    const actionsPortal = useHeaderActions(
        <>
            {hasMatches && (
                <Button variant="icon" size="icon" onClick={() => { setViewMode(v => v === "grid" ? "list" : "grid"); setSearchQuery("") }}>
                    {viewMode === "grid" ? <ListViewIcon size="20" strokeWidth={2} /> : <GridViewIcon size="20" strokeWidth={2} />}
                </Button>
            )}
            {editMode ? (
                <>
                    <Button variant="icon" size="icon" onClick={handleCancelEditMode}>
                        <Cancel01Icon size="20" strokeWidth={2} />
                    </Button>
                    <Button size="lg" onClick={handleSaveScores}>
                        <FloppyDiskIcon size="20" strokeWidth={2} />
                        Enregistrer tout
                    </Button>
                </>
            ) : (
                hasMatches && (
                    <Button size="lg" onClick={handleEnterEditMode}>
                        <PencilEdit01Icon size="20" strokeWidth={2} />
                        Modifier
                    </Button>
                )
            )}
        </>
    )

    if (loading || saving) {
        return <MatchSkeleton />
    }

    if (!currentEvent) {
        return (
            <>
                {headerPortal}
                {actionsPortal}
                <div className="h-full flex flex-col min-h-0">
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                        <Calendar03Icon className="h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun match</h3>
                        <p className="text-gray-500 mt-3">
                            Créez un événement depuis les paramètres pour commencer
                        </p>
                        <Button className="mt-6" size="lg" variant="outline" onClick={() => navigate("/admin/settings")}>
                            <Settings01Icon className="mr-2 h-4 w-4" />
                            Aller aux paramètres
                        </Button>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            {headerPortal}
            {actionsPortal}
            <div className="flex flex-col h-full min-h-0">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}
                {scoreErrors.size > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                        {scoreErrors.size} score(s) invalide(s). Corrigez les erreurs avant d'enregistrer.
                    </div>
                )}
                {!hasGroups ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Calendar03Icon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
                        <p className="text-gray-500 mt-2">
                            Créez d'abord les tableaux depuis les paramètres pour générer les matchs
                        </p>
                        <Button className="mt-4" variant="outline" size="lg" onClick={() => navigate("/admin/settings")}>
                            <Settings01Icon className="mr-2 h-4 w-4" />
                            Aller aux paramètres
                        </Button>
                    </div>
                ) : !hasPlayers ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Calendar03Icon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-semibold">Pas assez de joueurs</h3>
                        <p className="text-gray-500 mt-2">
                            Il faut au moins 2 joueurs par groupe pour générer les matchs
                        </p>
                        <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/settings")}>
                            <Settings01Icon className="mr-2 h-4 w-4" />
                            Aller aux paramètres
                        </Button>
                    </div>
                ) : !hasMatches ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Calendar03Icon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun match généré</h3>
                        <p className="text-gray-500 mt-2">
                            {matchCount} matchs à programmer sur {slotInfo?.total} créneaux disponibles
                            ({slotInfo?.datesCount} jour{(slotInfo?.datesCount || 0) > 1 ? 's' : ''} × {slotInfo?.slotsPerDay} créneaux × {slotInfo?.courtsCount} terrain{(slotInfo?.courtsCount || 0) > 1 ? 's' : ''})
                        </p>
                        <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/settings")}>
                            <Settings01Icon className="mr-2 h-4 w-4" />
                            Aller aux paramètres
                        </Button>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0">
                        {viewMode === "grid" ? (
                            <MatchScheduleGrid
                                matches={matches}
                                event={currentEvent}
                                round={currentRound}
                                editMode={editMode}
                                pendingScores={pendingScores}
                                onScoreChange={handleScoreChange}
                            />
                        ) : (
                            <MatchListView
                                matches={matches}
                                players={players}
                                searchQuery={searchQuery}
                                editMode={editMode}
                                pendingScores={pendingScores}
                                onScoreChange={handleScoreChange}
                                playerAbsences={playerAbsences}
                            />
                        )}
                    </div>
                )}
            </div>
        </>
    )
}

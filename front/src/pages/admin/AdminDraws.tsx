import { EventSelector } from "@/components/admin/settings/EventSelector"
import { DrawSkeleton } from "@/components/shared/skeletons/DrawSkeleton"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useEffectiveRules } from "@/hooks/useEffectiveRules"
import { usePlayers } from "@/contexts/PlayersContext"
import { useHeaderSlot, useHeaderActions } from "@/contexts/HeaderSlotContext"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useNavigate } from "react-router"
import { Settings01Icon, PencilEdit02Icon, HashtagIcon, StarIcon, Download01Icon, CodeIcon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { DrawTable } from "@/components/admin/draws/DrawTable"
import { MatchScoreDialog } from "@/components/admin/draws/MatchScoreDialog"
import { PlayerInfoDialog } from "@/components/admin/draws/PlayerInfoDialog"
import { EmbedDrawsDialog } from "@/components/admin/draws/EmbedDrawsDialog"
import { normalizeScoreForDb, computeWinnerId } from "@/lib/matchScore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { sortPlayersByEarliestDates } from "@/lib/matchScheduler"
import type { Match } from "@/types/match"
import type { GroupPlayer } from "@/types/draw"
import { exportTablesToPdfLazy } from "@/lib/exportPdfLazy"

export function AdminDraws () {

    const { currentEvent, currentRound } = useEvent()
    const { profile } = useAuth()
    const { groups, loading, fetchGroupsByRound } = useGroups()
    const { matches, fetchMatchesByRound, updateMatchResults, error: matchError } = useMatches()

    // Saisie du score depuis une case du tableau
    const [selectedCell, setSelectedCell] = useState<{ match: Match; rowPlayer: GroupPlayer; opponent: GroupPlayer } | null>(null)
    const [savingScore, setSavingScore] = useState(false)

    // Fiche d'un joueur, ouverte depuis son nom dans la première colonne
    const [selectedPlayer, setSelectedPlayer] = useState<GroupPlayer | null>(null)

    /** Le dialog renvoie le score vu du joueur de la ligne ; la base le stocke player1-player2. */
    const handleSaveScore = async (matchId: string, orientedScore: string) => {
        const match = matches.find(m => m.id === matchId)
        const rowPlayerId = selectedCell?.rowPlayer.id
        if (!match || !rowPlayerId) return

        setSavingScore(true)
        try {
            const dbScore = normalizeScoreForDb(orientedScore, match.player1_id === rowPlayerId)
            const winnerId = computeWinnerId(dbScore, match.player1_id, match.player2_id)
            await updateMatchResults([{ matchId, winnerId, score: dbScore }])
            setSelectedCell(null)
        } finally {
            setSavingScore(false)
        }
    }
    // Le bareme suit l'evenement affiche, et retombe sur le club a defaut.
    const { scoring } = useEffectiveRules(currentEvent?.id ?? null, profile?.club_id ?? null)
    const { players } = usePlayers()
    const [displayMode, setDisplayMode] = useState<"score" | "points">("score")
    const [embedOpen, setEmbedOpen] = useState(false)

    /*
     * Fiche complète du joueur sélectionné. Elle peut manquer : un joueur retiré
     * de la série reste visible dans un tableau déjà généré, mais sort du
     * contexte des joueurs. Le dialog sait fonctionner sans.
     */
    const selectedPlayerDetails = useMemo(
        () => players.find(p => p.id === selectedPlayer?.id) ?? null,
        [players, selectedPlayer],
    )

    const playerAbsences = useMemo(() => {
        const map = new Map<string, string[]>()
        for (const p of players) {
            if (p.unavailable.length > 0) map.set(p.id, p.unavailable)
        }
        return map
    }, [players])
    const navigate = useNavigate()
    const tablesRef = useRef<HTMLDivElement>(null)

    const handleExportPdf = useCallback(async () => {
        if (!tablesRef.current) return
        const toastId = toast.loading("Génération du PDF en cours...")
        try {
            // Le moteur PDF n'est telecharge qu'ici, au premier clic.
            await exportTablesToPdfLazy(tablesRef.current, "tableaux.pdf")
            toast.success("PDF téléchargé", { id: toastId })
        } catch (err) {
            console.error("Export PDF error:", err)
            toast.error("Échec de l'export PDF", { id: toastId })
        }
    }, [])

    const headerPortal = useHeaderSlot(
        <>
            <h3 className="text-lg font-semibold">Tableaux</h3>
            <EventSelector />
        </>
    )

    const actionsPortal = useHeaderActions(
        <>
            <Button
                variant="icon"
                size="icon"
                onClick={() => setDisplayMode(prev => prev === "score" ? "points" : "score")}
            >
                {displayMode === "score" ? (
                    <StarIcon size="20" strokeWidth={2} />
                ) : (
                    <HashtagIcon size="20" strokeWidth={2} />
                )}
            </Button>
            {/* Entre les deux boutons existants : afficher, partager, exporter. */}
            <Button
                variant="outline"
                size="icon"
                onClick={() => setEmbedOpen(true)}
                title="Intégrer les tableaux sur un site"
                aria-label="Intégrer les tableaux sur un site"
            >
                <CodeIcon size="20" strokeWidth={2} />
            </Button>
            {groups.length > 0 && (
                <Button variant="outline" size="icon" onClick={handleExportPdf}>
                    <Download01Icon size="20" strokeWidth={2} />
                </Button>
            )}
        </>
    )

    // charger les groups, matchs et config club quand l'event change
    useEffect(() => {
        if(currentRound) {
            fetchGroupsByRound(currentRound.id)
            fetchMatchesByRound(currentRound.id)
        }
    }, [currentRound, fetchGroupsByRound, fetchMatchesByRound])

    if(loading) {
        return <DrawSkeleton />
    }

    if(!currentEvent) {
        return (
            <>
                {headerPortal}
                {actionsPortal}
                <div className="h-full flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                        <PencilEdit02Icon className="h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
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
            {matchError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                    {matchError}
                </div>
            )}

            {/* Tableaux */}
            {groups.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <PencilEdit02Icon className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
                    <p className="text-gray-500 mt-2">
                        Créez des tableaux depuis les paramètres de l'événement
                    </p>
                    <Button className="mt-4" variant="outline" size="lg" onClick={() => navigate("/admin/settings")}>
                        <Settings01Icon className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            ) : (
                <ScrollArea className="flex-1 min-h-0" type="auto">
                    <div ref={tablesRef} className="grid grid-cols-2 3xl:grid-cols-3 gap-6">
                        {groups.map(group => {
                            const groupMatches = matches.filter(m => m.group_id === group.id)
                            const sortedGroup = sortPlayersByEarliestDates(group, groupMatches)
                            return (
                                <div key={group.id}>
                                    <DrawTable group={sortedGroup} matches={groupMatches} scoringRules={scoring} displayMode={displayMode} playerAbsences={playerAbsences} onSelectMatch={(match, rowPlayer, opponent) => setSelectedCell({ match, rowPlayer, opponent })} onSelectPlayer={setSelectedPlayer} />
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            )}

            <MatchScoreDialog
                open={!!selectedCell}
                onOpenChange={(open) => { if (!open) setSelectedCell(null) }}
                match={selectedCell?.match ?? null}
                rowPlayer={selectedCell?.rowPlayer ?? null}
                opponent={selectedCell?.opponent ?? null}
                onSave={handleSaveScore}
                saving={savingScore}
            />

            <PlayerInfoDialog
                open={!!selectedPlayer}
                onOpenChange={(open) => { if (!open) setSelectedPlayer(null) }}
                player={selectedPlayer}
                details={selectedPlayerDetails}
            />

            <EmbedDrawsDialog
                open={embedOpen}
                onOpenChange={setEmbedOpen}
                embedToken={currentEvent?.embed_token ?? null}
                eventName={currentEvent?.event_name ?? ""}
                roundNumber={currentRound?.round_number ?? null}
            />
        </div>
        </>
    )
}

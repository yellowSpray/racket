import { DrawSkeleton } from "@/components/shared/skeletons/DrawSkeleton"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useEffectiveRules } from "@/hooks/useEffectiveRules"
import { usePlayers } from "@/contexts/PlayersContext"
import { useHeaderSlot } from "@/contexts/HeaderSlotContext"
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

/*
 * Les trois actions de la page, en version compacte sur telephone.
 *
 * A taille normale elles font 271 px a elles seules, plus que la colonne d'un
 * ecran de 375 une fois le titre servi : la ligne debordait de la fenetre. Sous
 * 640 elles perdent 1 px de hauteur sur 8, deux points de taille de texte et
 * leurs pictogrammes passent de 16 a 14.
 *
 * Elles gardent leurs libelles : « Points » et « Scores » sont deux etats du
 * meme bouton, et un pictogramme seul ne dirait pas lequel est en cours.
 */
const ACTION = "border h-7 gap-1 px-2 text-xs has-[>svg]:px-2 [&_svg]:size-3.5 " +
    "sm:h-8 sm:gap-1.5 sm:px-3 sm:text-sm sm:has-[>svg]:px-2.5 sm:[&_svg]:size-4"

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

    /**
     * Retire le résultat d'un match : il redevient à jouer.
     *
     * Le vainqueur part avec le score, sans quoi la base garderait un gagnant
     * pour une rencontre sans résultat, et l'Elo continuerait de le compter.
     */
    const handleClearScore = async (matchId: string) => {
        setSavingScore(true)
        try {
            await updateMatchResults([{ matchId, winnerId: null, score: null }])
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

    /*
     * Les actions vivent sur la ligne du titre, pas dans le header.
     *
     * Elles y etaient en pastilles sans libelle, entre le fil d'Ariane et la
     * recherche : trois pictogrammes qu'il fallait survoler pour savoir ce
     * qu'ils font, et qui appartiennent a cet ecran seul alors que le header
     * porte ce qui vaut pour toute l'application.
     */
    const headerPortal = useHeaderSlot(
        <>
            <h3 className="text-lg font-semibold">Tableaux</h3>

            <div className="ml-auto flex shrink-0 items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={ACTION}
                    onClick={() => setDisplayMode(prev => prev === "score" ? "points" : "score")}
                >
                    {displayMode === "score" ? (
                        <><HashtagIcon size={16} strokeWidth={2} />Points</>
                    ) : (
                        <><StarIcon size={16} strokeWidth={2} />Scores</>
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className={ACTION}
                    onClick={() => setEmbedOpen(true)}
                    title="Intégrer les tableaux sur un site"
                >
                    <CodeIcon size={16} strokeWidth={2} />
                    Intégrer
                </Button>

                {groups.length > 0 && (
                    <Button variant="outline" size="sm" className={ACTION} onClick={handleExportPdf}>
                        <Download01Icon size={16} strokeWidth={2} />
                        PDF
                    </Button>
                )}
            </div>
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
                    {/*
                      * Des pistes a la taille d'un tableau, et autant que l'ecran
                      * en porte.
                      *
                      * Un tableau de box mesure **519 px au minimum**, somme des
                      * planchers de ses huit colonnes, et 532 au maximum. Treize
                      * pixels d'elasticite : ce n'est pas un objet fluide. En
                      * fractions, trois colonnes a 1440 donnaient des pistes de
                      * 374 ; `useFitToWidth` reduisait alors le tableau a 72 %
                      * puis s'arretait a son plancher de 0.6, et le reste partait
                      * en barre de defilement. Rapetisse **et** coupe.
                      *
                      * `auto-fill` compte les pistes lui-meme a partir du
                      * minimum, au lieu d'un nombre fixe par palier qu'il
                      * faudrait recalculer a chaque changement de gouttiere. Le
                      * `min(100%, 519px)` evite le debordement sous 519.
                      *
                      * `justify-center` parce que la colonne de contenu est
                      * centree : voir `DashboardLayout`.
                      */}
                    <div ref={tablesRef} className="grid justify-center gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,519px),532px))]">
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
                onClear={handleClearScore}
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

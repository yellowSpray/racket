import { MatchScheduleGrid } from "@/components/admin/matches/MatchScheduleGrid"
import { MatchListView } from "@/components/admin/matches/MatchListView"
import { MatchSkeleton } from "@/components/shared/skeletons/MatchSkeleton"
import { useEvent } from "@/contexts/EventContext"
import { usePlayers } from "@/contexts/PlayersContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useHeaderSlot } from "@/contexts/HeaderSlotContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Calendar03Icon, Settings01Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { ActionsDesMatchs } from "@/components/admin/matches/ActionsDesMatchs"
import { ChoixDeLaDate } from "@/components/admin/matches/ChoixDeLaDate"
import { aujourdhuiLocal, dateParDefaut, datesDeJeu } from "@/lib/datesDeJeu"
import { PaginationDesTerrains } from "@/components/admin/matches/PaginationDesTerrains"
import {
    pageValide,
    terrainsDesMatchs,
    terrainsParPage,
    trancheDeTerrains,
} from "@/lib/paginationTerrains"
import { useLargeur } from "@/hooks/useLargeur"
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
    const [dateChoisie, setDateChoisie] = useState<string | null>(null)
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

    /*
     * LES DEUX VUES N'AFFICHENT QU'UNE JOURNEE, celle de la barre de dates.
     *
     * La journee retenue survit au changement de serie tant qu'elle existe
     * encore, sinon on retombe sur la prochaine a jouer : changer de vue ne
     * doit pas renvoyer au premier jour de la serie.
     */
    const dates = useMemo(() => datesDeJeu(matches), [matches])

    useEffect(() => {
        setDateChoisie(precedente =>
            precedente && dates.includes(precedente)
                ? precedente
                : dateParDefaut(dates, aujourdhuiLocal()),
        )
    }, [dates])

    /*
     * LES TERRAINS QUI TIENNENT DANS LA COLONNE, ET DEUX FLECHES POUR LE RESTE.
     *
     * Sept terrains reclament 1483 px et la colonne n'en offre 1169 a 1440 px
     * d'ecran. Faire defiler la table emporterait sa colonne des heures, et la
     * figer demanderait de passer en `border-separate`.
     *
     * Le calcul vit ici et non dans la grille parce que les deux fleches
     * vivent sur la ligne du titre, avec la date et les actions. La largeur
     * est celle de la colonne de contenu, mesuree, jamais deduite de la
     * fenetre : la barre laterale lui prend 207 px a partir de 1024.
     */
    const [boiteContenu, largeurContenu] = useLargeur()
    const [pageTerrains, setPageTerrains] = useState(0)

    const terrains = useMemo(
        () => terrainsDesMatchs(matches, currentRound?.number_of_courts ?? 1),
        [matches, currentRound?.number_of_courts],
    )

    const terrainsParEcran = largeurContenu === 0
        ? terrains.length
        : terrainsParPage(largeurContenu, terrains.length)
    const pageDesTerrains = pageValide(pageTerrains, terrains.length, terrainsParEcran)
    const terrainsVisibles = trancheDeTerrains(terrains, pageDesTerrains, terrainsParEcran)

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

    /*
     * LA LIGNE DE TITRE PORTE LES ACTIONS DE LA PAGE, poussees a droite. Elles
     * etaient dans le header, qui porte ce qui vaut pour toute l'application,
     * pas ce qui vaut pour un ecran. Meme deplacement que sur les tableaux et
     * sur les joueurs, et meme gabarit, `lib/actionPage`.
     *
     * LA RECHERCHE DE LA PAGE EST RETIREE, comme sur les joueurs. C'est le
     * champ du header qui s'en chargera une fois qu'il aura un index global a
     * interroger. D'ici la, cet ecran n'a plus de recherche du tout.
     *
     * Consequence a connaitre : `MatchScheduleGrid` et `MatchListView` gardent
     * leur prop `searchQuery`, la premiere pour surligner, la seconde pour
     * filtrer, mais plus personne ne la remplit. Le code est vivant et le
     * chemin est mort ; il se rallumera en une ligne le jour de l'index.
     */
    const headerPortal = useHeaderSlot(
        <>
            <h3 className="text-lg font-semibold">Matchs</h3>

            {/*
              * LA BARRE DE DATES EST SUR LA LIGNE DU TITRE DES 768 PX. En
              * dessous elle passe seule sur une seconde ligne, `w-full`
              * forcant le retour, et `order-last` la posant sous les actions
              * plutot qu'entre elles et le titre.
              */}
            <ChoixDeLaDate
                dates={dates}
                valeur={dateChoisie}
                onChange={setDateChoisie}
                className="order-last w-full md:order-none md:w-auto"
            />

            {/*
              * LE BORD DROIT PORTE LES DEUX COMMANDES DE LA VUE : la page de
              * terrains, puis les actions. Le titre et la date tiennent le
              * bord gauche, ce qui laisse la respiration au milieu plutot
              * qu'entre deux groupes de boutons.
              *
              * La pagination n'a de sens que sur la vue par terrain : la vue
              * par boxe n'a pas de colonne a couper.
              */}
            <div className="ml-auto flex shrink-0 items-center gap-3">
                {viewMode === "grid" && hasMatches && (
                    <PaginationDesTerrains
                        page={pageDesTerrains}
                        parPage={terrainsParEcran}
                        total={terrains.length}
                        onChange={setPageTerrains}
                    />
                )}

                <ActionsDesMatchs
                    vue={viewMode}
                    onBasculerVue={() => setViewMode(v => v === "grid" ? "list" : "grid")}
                    modeEdition={editMode}
                    onModifier={handleEnterEditMode}
                    onAnnuler={handleCancelEditMode}
                    onEnregistrer={handleSaveScores}
                    peutModifier={hasMatches}
                />
            </div>
        </>
    )

    if (loading || saving) {
        return <MatchSkeleton />
    }

    if (!currentEvent) {
        return (
            <>
                {headerPortal}
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
                    <>
                        <div ref={boiteContenu} className="flex-1 min-h-0">
                            {viewMode === "grid" ? (
                                <MatchScheduleGrid
                                    matches={matches}
                                    event={currentEvent}
                                    round={currentRound}
                                    date={dateChoisie}
                                    terrainsVisibles={terrainsVisibles}
                                    editMode={editMode}
                                    pendingScores={pendingScores}
                                    onScoreChange={handleScoreChange}
                                />
                            ) : (
                                <MatchListView
                                    matches={matches}
                                    players={players}
                                    date={dateChoisie}
                                    editMode={editMode}
                                    pendingScores={pendingScores}
                                    onScoreChange={handleScoreChange}
                                    playerAbsences={playerAbsences}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

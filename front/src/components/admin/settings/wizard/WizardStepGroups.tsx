import { GroupRoundPreview } from "./GroupRoundPreview"
import { MovementLegend } from "./MovementLegend"
import type { Event, EventRound } from "@/types/event"
import { transformGroups, type Group, type GroupPlayer } from "@/types/draw"
import type { GroupStandings, PromotionResult } from "@/types/ranking"
import { useGroups } from "@/hooks/useGroups"
import { usePlayers } from "@/contexts/PlayersContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useAuth } from "@/contexts/AuthContext"
import { usePreviousRound } from "@/hooks/usePreviousRound"
import { supabase } from "@/lib/supabaseClient"
import { calculateOptimalDistribution, calculateAllDistributions } from "@/lib/groupDistributionCalculator"
import { distributePlayersByRanking } from "@/lib/groupDistribution"
import { calculateGroupStandings } from "@/lib/rankingEngine"
import { calculatePromotions } from "@/lib/promotionEngine"
import { buildProposedGroups } from "@/lib/buildProposedGroups"
import { computePlayerMovements } from "@/lib/playerMovement"
import { applyPromotionMoves } from "@/lib/promotionPreview"
import { buildPlacementContext, comparePlacement } from "@/lib/playerOrdering"
import { useEffect, useState, useMemo } from "react"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GroupDndManager } from "./GroupDndManager"
import { ProposedGroups } from "./ProposedGroups"
import { GroupPlayerRow } from "./GroupPlayerRow"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { validateGroups } from "@/lib/groupPlayerMove"
import { sortGroupsByName } from "@/lib/utils"
import { InformationCircleIcon, SparklesIcon, Settings01Icon, ArrowLeftRightIcon, Delete02Icon, UserGroupIcon, Award01Icon, Tick02Icon, UserRemove01Icon, UserAdd01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"

interface WizardStepGroupsProps {
    event: Event
    round: EventRound
    groups: Group[]
    eventPlayerIds: Set<string>
    onGroupsChanged: (groups: Group[]) => void
    /** Omis en mode section : la navigation d'étape n'est alors pas rendue. */
    onNext?: () => void
    /** Omis en mode section : la navigation d'étape n'est alors pas rendue. */
    onPrevious?: () => void
}

type CreationMode = "auto" | "manual" | "previous"

/** Static column showing groups with uniform row heights */
function StaticGroupColumn({ title, titleExtra, groups, maxRows, renderPlayer, sortPlayers }: {
    title: string
    titleExtra?: React.ReactNode
    groups: Group[]
    maxRows: number
    renderPlayer: (player: GroupPlayer, group: Group) => React.ReactNode
    sortPlayers?: (a: GroupPlayer, b: GroupPlayer, groupIndex: number) => number
}) {
    return (
        <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2 mr-3">
                <h4 className="text-sm font-semibold text-muted-foreground truncate ml-3">{title}</h4>
                {titleExtra}
            </div>
            {groups.map((group, groupIndex) => {
                const players = sortPlayers
                    ? [...(group.players || [])].sort((a, b) => sortPlayers(a, b, groupIndex))
                    : (group.players || [])
                const emptySlots = maxRows - players.length
                return (
                    <div key={group.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">{group.group_name}</h5>
                            <Badge variant="default">
                                <UserGroupIcon className="h-3 w-3 mr-1" />
                                {players.length}
                            </Badge>
                        </div>
                        <ul className="space-y-2">
                            {players.map(player => (
                                <li key={player.id} className="h-8 flex items-center">
                                    {renderPlayer(player, group)}
                                </li>
                            ))}
                            {Array.from({ length: Math.max(0, emptySlots) }).map((_, i) => (
                                <li key={`empty-${i}`} className="h-8 flex items-center">
                                    <div className="w-full text-sm px-2 py-1.5 rounded border border-dashed border-gray-200 text-muted-foreground/40 italic">
                                        Place libre
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            })}
        </div>
    )
}

export function WizardStepGroups({ event, round, groups, eventPlayerIds, onGroupsChanged, onNext, onPrevious }: WizardStepGroupsProps) {
    const { createGroups, assignPlayersToGroup, loading: groupsLoading } = useGroups()
    const { players } = usePlayers()
    const { profile } = useAuth()
    const { clubConfig, scoringRules, promotionRules, fetchClubConfig, defaultScoring, defaultPromotion } = useClubConfig()
    const { previousRound, previousGroups, previousMatches, loading: prevLoading, fetchPreviousRound } = usePreviousRound()

    const [mode, setMode] = useState<CreationMode>("auto")
    const [numberOfGroups, setNumberOfGroups] = useState(3)
    const { handleError, clearError } = useErrorHandler()
    const [managementMode, setManagementMode] = useState(false)
    const [creating, setCreating] = useState(false)
    const [selectedDistributionIndex, setSelectedDistributionIndex] = useState(0)
    const [proposedLocalGroups, setProposedLocalGroups] = useState<Group[] | null>(null)

    const maxPlayersPerGroup = clubConfig?.default_max_players_per_group ?? 6

    useEffect(() => {
        if (profile?.club_id) {
            fetchClubConfig(profile.club_id)
        }
    }, [profile?.club_id, fetchClubConfig])

    // Charge la serie precedente du meme evenement (Serie N-1)
    useEffect(() => {
        if (!previousRound && !prevLoading) {
            fetchPreviousRound(event.id, round.round_number)
        }
    }, [event.id, round.round_number, previousRound, prevLoading, fetchPreviousRound])

    // Calculate standings and promotions from previous event data
    const effectiveScoringRules = useMemo(
        () => scoringRules ?? { id: "", club_id: "", score_points: defaultScoring.score_points },
        [scoringRules, defaultScoring.score_points]
    )
    const effectivePromotionRules = useMemo(
        () => promotionRules ?? { id: "", club_id: "", ...defaultPromotion },
        [promotionRules, defaultPromotion]
    )

    const previousStandings: GroupStandings[] = useMemo(() => {
        if (!previousRound || previousGroups.length === 0) return []
        return previousGroups.map(group => {
            const groupMatches = previousMatches.filter(m => m.group_id === group.id)
            const groupPlayers = (group.players || []).map(p => ({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
            }))
            return calculateGroupStandings(groupMatches, group.id, group.group_name, groupPlayers, effectiveScoringRules)
        })
    }, [previousRound, previousGroups, previousMatches, effectiveScoringRules])

    const activePlayers = players.filter(p => eventPlayerIds.has(p.id))

    const playerAbsences = useMemo(() => {
        const map = new Map<string, string[]>()
        for (const p of activePlayers) {
            if (p.unavailable.length > 0) map.set(p.id, p.unavailable)
        }
        return map
    }, [activePlayers])

    const registeredPlayerIds = useMemo(
        () => new Set(activePlayers.map(p => p.id)),
        [activePlayers]
    )

    const promotionResult: PromotionResult = useMemo(() => {
        if (previousStandings.length === 0) return { moves: [], stayingPlayers: [] }
        const groupOrder = previousGroups.map(g => g.id)
        return calculatePromotions(previousStandings, effectivePromotionRules, groupOrder)
    }, [previousStandings, previousGroups, effectivePromotionRules])

    // Parcours de chaque joueur des tableaux enregistres, depuis la serie precedente.
    // Le mouvement se lit dans les donnees ; la raison est reconstituee en rejouant
    // le moteur de promotion et en comparant a ce qui a ete reellement enregistre.
    const playerMovements = useMemo(() => {
        if (groups.length === 0 || previousGroups.length === 0) return undefined
        return computePlayerMovements({
            currentGroups: groups,
            previousGroups,
            previousStandings,
            promotionResult,
        })
    }, [groups, previousGroups, previousStandings, promotionResult])

    const placementContext = useMemo(
        () => buildPlacementContext(previousGroups, previousStandings, promotionResult),
        [previousGroups, previousStandings, promotionResult]
    )

    const previousPlayerIds = useMemo(
        () => new Set(previousGroups.flatMap(g => (g.players || []).map(p => p.id))),
        [previousGroups]
    )

    // New players: active players not present in the previous event
    const newPlayers = useMemo(() => {
        return activePlayers
            .filter(p => !previousPlayerIds.has(p.id))
            .map(p => ({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
                phone: p.phone,
                power_ranking: p.power_ranking,
            }))
    }, [activePlayers, previousPlayerIds])

    // Build move map for column indicators
    const moveMap = useMemo(() => {
        const map = new Map<string, "promotion" | "relegation">()
        for (const move of promotionResult.moves) {
            map.set(move.playerId, move.type)
        }
        return map
    }, [promotionResult.moves])

    // Colonne 2 — Promotions seules : les regles appliquees aux classements, sans rien
    // retirer ni redistribuer. Les futurs partants y figurent donc a la place que les
    // regles leur donnent (un relegue descend, un promu monte), ce qui rend l'etape
    // verifiable avant que les departs ne brouillent la lecture.
    const promotionOnlyGroups = useMemo(() => {
        if (previousStandings.length === 0 || previousMatches.length === 0) return null
        return applyPromotionMoves(previousGroups, promotionResult)
    }, [previousGroups, previousStandings, previousMatches, promotionResult])

    // Colonne 3 — Departs : on retire les non-reinscrits, ce qui peut reduire le nombre
    // de tableaux et forcer une redistribution. Les partants restent affiches, barres, a
    // leur place d'apres promotion (et non a leur place d'origine).
    const afterDepartureGroups = useMemo(() => {
        if (!promotionOnlyGroups) return null
        const cleanGroups = buildProposedGroups(previousGroups, previousStandings, promotionResult, registeredPlayerIds, [], maxPlayersPerGroup)
        if (!cleanGroups || cleanGroups.length === 0) return null

        const departedByBox = new Map<number, GroupPlayer[]>()
        promotionOnlyGroups.forEach((group, index) => {
            const departed = (group.players || []).filter(p => !registeredPlayerIds.has(p.id))
            if (departed.length === 0) return
            // Si des tableaux ont disparu, on rattache au dernier restant plutot que
            // de laisser le joueur s'evaporer de l'affichage.
            const boxIndex = Math.min(index, cleanGroups.length - 1)
            departedByBox.set(boxIndex, [...(departedByBox.get(boxIndex) ?? []), ...departed])
        })

        return cleanGroups.map((group, index) => {
            const departed = departedByBox.get(index)
            if (!departed) return group
            return { ...group, players: [...(group.players || []), ...departed] }
        })
    }, [promotionOnlyGroups, previousGroups, previousStandings, promotionResult, registeredPlayerIds, maxPlayersPerGroup])

    // Lookup playerId → points from previous standings
    const standingsPointsMap = useMemo(() => {
        const map = new Map<string, number>()
        for (const group of previousStandings) {
            for (const ps of group.standings) {
                map.set(ps.playerId, ps.points)
            }
        }
        return map
    }, [previousStandings])

    // Column 3: exact copy of column 2 (no new players, no departed players) — starting point for DnD adjustments
    const autoProposedGroups = useMemo(() => {
        if (previousStandings.length === 0 || previousMatches.length === 0) return null
        const built = buildProposedGroups(previousGroups, previousStandings, promotionResult, registeredPlayerIds, [], maxPlayersPerGroup)
        if (!built) return null

        // `buildProposedGroups` ordonne deja chaque tableau (arrivees d'en haut,
        // maintenus, relegues restes sur place, arrivees d'en bas — chaque bloc par
        // classement). Un tri supplementaire ici ecrasait cet ordre.
        return built
    }, [previousGroups, previousStandings, previousMatches, promotionResult, registeredPlayerIds, maxPlayersPerGroup])

    // Extend autoProposedGroups by redistributing existing players when new players don't fit
    const autoProposedGroupsWithCapacity = useMemo(() => {
        if (!autoProposedGroups) return null
        if (newPlayers.length === 0) return autoProposedGroups

        const totalOccupied = autoProposedGroups.reduce((sum, g) => sum + (g.players?.length ?? 0), 0)
        const totalCapacity = autoProposedGroups.reduce((sum, g) => sum + g.max_players, 0)
        const availableSlots = totalCapacity - totalOccupied

        if (newPlayers.length <= availableSlots) return autoProposedGroups

        // Calculer le bon nombre de groupes pour accueillir tout le monde
        const allDist = calculateAllDistributions(totalOccupied + newPlayers.length, maxPlayersPerGroup)
        const targetGroupCount = allDist.length > 0
            ? allDist[allDist.length - 1].distribution.length
            : autoProposedGroups.length + Math.ceil((newPlayers.length - availableSlots) / maxPlayersPerGroup)

        if (targetGroupCount <= autoProposedGroups.length) return autoProposedGroups

        // Aplatir les joueurs dans leur ordre actuel (deja trie par placement)
        const orderedPlayers = autoProposedGroups.flatMap(g => g.players || [])

        // Répartir équitablement sur targetGroupCount groupes
        const perGroup = Math.floor(orderedPlayers.length / targetGroupCount)
        const remainder = orderedPlayers.length % targetGroupCount
        const roundId = autoProposedGroups[0]?.round_id ?? round.id
        const result: Group[] = []
        let playerIdx = 0

        for (let i = 0; i < targetGroupCount; i++) {
            const slotCount = i < remainder ? perGroup + 1 : perGroup
            result.push({
                id: `proposed-new-${i}`,
                round_id: roundId,
                group_name: `Box ${i + 1}`,
                max_players: Math.max(maxPlayersPerGroup, slotCount),
                created_at: "",
                // Les tableaux changent de composition : on reordonne chacun selon sa
                // nouvelle position, sinon un relegue rattrape ici resterait en tete.
                players: orderedPlayers
                    .slice(playerIdx, playerIdx + slotCount)
                    .sort((a, b) => comparePlacement(a.id, b.id, i, placementContext)),
            })
            playerIdx += slotCount
        }

        return result
    }, [autoProposedGroups, newPlayers, maxPlayersPerGroup, round.id, placementContext])

    // Set initial proposed groups from auto-computation (only when user hasn't modified via DnD)
    useEffect(() => {
        if (mode === "previous" && autoProposedGroupsWithCapacity && !proposedLocalGroups) {
            setProposedLocalGroups(autoProposedGroupsWithCapacity)
        }
    }, [mode, autoProposedGroupsWithCapacity, proposedLocalGroups])

    const totalPlayers = activePlayers.length
    const optimalDistribution = calculateOptimalDistribution(totalPlayers, maxPlayersPerGroup)
    const allDistributions = calculateAllDistributions(totalPlayers, maxPlayersPerGroup)
    const selectedDistribution = allDistributions[selectedDistributionIndex] ?? allDistributions[0]

    const hasGroups = groups.length > 0
    const hasPlayers = groups.some(g => (g.players || []).length > 0)

    // Unregistered player IDs from previous event (players who left)
    const unregisteredFromPrevious = useMemo(() => {
        const set = new Set<string>()
        for (const group of previousGroups) {
            for (const player of group.players || []) {
                if (!registeredPlayerIds.has(player.id)) {
                    set.add(player.id)
                }
            }
        }
        return set
    }, [previousGroups, registeredPlayerIds])

    /** Les partants restent en bas du tableau ; le reste suit l'ordre de placement. */
    const sortByPlacement = useMemo(() => (a: GroupPlayer, b: GroupPlayer, groupIndex: number) => {
        const aDeparted = unregisteredFromPrevious.has(a.id)
        const bDeparted = unregisteredFromPrevious.has(b.id)
        if (aDeparted !== bDeparted) return aDeparted ? 1 : -1
        return comparePlacement(a.id, b.id, groupIndex, placementContext)
    }, [placementContext, unregisteredFromPrevious])

    // Departed players with names (for column 2 badge tooltip)
    const departedPlayers = useMemo(() => {
        const result: GroupPlayer[] = []
        for (const group of previousGroups) {
            for (const player of group.players || []) {
                if (!registeredPlayerIds.has(player.id)) {
                    result.push(player)
                }
            }
        }
        return result
    }, [previousGroups, registeredPlayerIds])

    // Uniform row height based on max players per group
    const maxRows = maxPlayersPerGroup

    const handleApplyFromPrevious = async () => {
        if (!proposedLocalGroups || proposedLocalGroups.length === 0) return

        clearError()
        setCreating(true)

        try {
            const groupsToCreate = proposedLocalGroups.map(g => ({
                round_id: round.id,
                group_name: g.group_name,
                max_players: g.max_players,
            }))

            const { data: createdGroupsData, error: insertError } = await supabase
                .from("groups")
                .insert(groupsToCreate)
                .select()

            if (insertError) throw new Error(insertError.message)

            // Match by group_name (not index) to guard against DB return order variance
            const prevGroupsByName = new Map(createdGroupsData.map(g => [g.group_name as string, g.id as string]))

            // Insert directly (bypass useGroups.assignPlayersToGroup to avoid unnecessary
            // fetchGroupsByRound calls that would re-render with DB order and break player ordering)
            await Promise.all(proposedLocalGroups.map(async (group) => {
                const groupId = prevGroupsByName.get(group.group_name)
                if (!groupId) return
                const playerIds = (group.players || []).map(p => p.id)
                if (playerIds.length === 0) return
                const { error } = await supabase.from("group_players").insert(
                    playerIds.map(profileId => ({ group_id: groupId, profile_id: profileId }))
                )
                if (error) throw new Error(error.message)
            }))

            // Preserve proposedLocalGroups order and player arrays exactly as-is
            const transformed = proposedLocalGroups.map(group => ({
                ...group,
                id: prevGroupsByName.get(group.group_name) ?? group.id,
                round_id: round.id,
            }))
            onGroupsChanged(transformed)
        } catch (err) {
            handleError(err)
        } finally {
            setCreating(false)
        }
    }

    const handleCreateEmpty = async () => {
        if (mode !== "manual") return
        clearError()
        setCreating(true)

        try {
            await createGroups(round.id, numberOfGroups, maxPlayersPerGroup)
            const { data } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("round_id", round.id)
                .order("group_name")

            if (data) {
                onGroupsChanged(sortGroupsByName(transformGroups(data)))
            }
        } catch (err) {
            handleError(err)
        } finally {
            setCreating(false)
        }
    }

    const handleGenerateAuto = async () => {
        if (activePlayers.length === 0) {
            handleError(new Error("Pas assez de joueurs actifs"))
            return
        }

        if (!selectedDistribution) {
            handleError(new Error(optimalDistribution.message || "Distribution impossible"))
            return
        }

        clearError()
        setCreating(true)

        try {
            const groupsToCreate = selectedDistribution.distribution.map((count, index) => ({
                round_id: round.id,
                group_name: `Box ${index + 1}`,
                max_players: Math.max(maxPlayersPerGroup, count),
            }))

            const { data: createdGroupsData, error: insertError } = await supabase
                .from("groups")
                .insert(groupsToCreate)
                .select()

            if (insertError) throw new Error(insertError.message)

            const playersForDistribution: GroupPlayer[] = activePlayers.map(p => ({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
                phone: p.phone,
                power_ranking: p.power_ranking,
            }))

            const distributedGroups = distributePlayersByRanking(
                playersForDistribution,
                selectedDistribution.numberOfGroups
            )

            const autoGroupsByName = new Map(createdGroupsData.map(g => [g.group_name as string, g.id as string]))
            await Promise.all(distributedGroups.map((players, i) => {
                const groupId = autoGroupsByName.get(`Box ${i + 1}`) ?? createdGroupsData[i].id
                const playerIds = players.map(p => p.id)
                return playerIds.length > 0 ? assignPlayersToGroup(groupId, playerIds, round.id) : Promise.resolve()
            }))

            const { data } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("round_id", round.id)
                .order("group_name")

            if (data) {
                onGroupsChanged(sortGroupsByName(transformGroups(data)))
            }
        } catch (err) {
            handleError(err)
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteGroups = async () => {
        setCreating(true)
        try {
            const { error: deleteError } = await supabase
                .from("groups")
                .delete()
                .eq("round_id", round.id)

            if (deleteError) throw new Error(deleteError.message)
            onGroupsChanged([])
        } catch (err) {
            handleError(err)
        } finally {
            setCreating(false)
        }
    }

    const isLoading = groupsLoading || creating

    return (
        <div className="py-4 flex flex-col flex-1 min-h-0">
            {!hasGroups ? (
                /* Mode creation de groupes */
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant={mode === "auto" ? "default" : "outline"}
                                size="sm"
                                onClick={() => { setMode("auto"); setProposedLocalGroups(null) }}
                            >
                                <SparklesIcon className="h-4 w-4" />
                                Auto
                            </Button>
                            <Button
                                type="button"
                                variant={mode === "manual" ? "default" : "outline"}
                                size="sm"
                                onClick={() => { setMode("manual"); setProposedLocalGroups(null) }}
                            >
                                <Settings01Icon className="h-4 w-4" />
                                Manuel
                            </Button>
                            {previousRound && (
                                <Button
                                    type="button"
                                    variant={mode === "previous" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setMode("previous")}
                                >
                                    <Award01Icon className="h-4 w-4" />
                                    Box precedent
                                </Button>
                            )}
                        </div>
                        {mode === "manual" && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateEmpty}
                                disabled={isLoading}
                            >
                                <Tick02Icon className="h-5 w-5" />
                                Valider
                            </Button>
                        )}
                        {mode === "auto" && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleGenerateAuto}
                                disabled={isLoading || !selectedDistribution || totalPlayers === 0}
                            >
                                <Tick02Icon className="h-5 w-5" />
                                Valider
                            </Button>
                        )}
                        {mode === "previous" && proposedLocalGroups && proposedLocalGroups.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleApplyFromPrevious}
                                disabled={isLoading}
                            >
                                <Tick02Icon className="h-5 w-5" />
                                Valider
                            </Button>
                        )}
                    </div>

                    {mode === "auto" && (
                        <Alert variant={allDistributions.length === 0 || totalPlayers === 0 ? "destructive" : "default"}>
                            <InformationCircleIcon className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{totalPlayers} joueur{totalPlayers > 1 ? "s" : ""} actif{totalPlayers > 1 ? "s" : ""}</strong>
                                {totalPlayers === 0 && (
                                    <>
                                        <br />
                                        <span className="text-sm">
                                            Aucun joueur avec le status "active" trouvé. Vérifiez les status des joueurs dans la liste.
                                        </span>
                                    </>
                                )}
                                {totalPlayers > 0 && allDistributions.length > 1 && (
                                    <>
                                        {" "}: choisissez une configuration
                                        <div className="flex flex-col gap-1.5 mt-2">
                                            {allDistributions.map((option, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => setSelectedDistributionIndex(index)}
                                                    className={`text-left text-sm px-3 py-1.5 rounded-md border transition-colors ${
                                                        selectedDistributionIndex === index
                                                            ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                                                            : "border-gray-200 hover:border-gray-300 text-gray-600"
                                                    }`}
                                                >
                                                    {option.label}
                                                    {option.relaxed && option.message && (
                                                        <span className="text-amber-600 font-normal ml-2">({option.message})</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {totalPlayers > 0 && allDistributions.length === 1 && selectedDistribution && (
                                    <>
                                        {" "}seront répartis automatiquement
                                        <br />
                                        <span className="text-sm font-semibold text-blue-700">
                                            {selectedDistribution.label}
                                        </span>
                                        {selectedDistribution.relaxed && selectedDistribution.message && (
                                            <>
                                                <br />
                                                <span className="text-sm text-amber-600">
                                                    {selectedDistribution.message}
                                                </span>
                                            </>
                                        )}
                                    </>
                                )}
                                {totalPlayers > 0 && allDistributions.length === 0 && (
                                    <>
                                        <br />
                                        <span className="text-sm">
                                            {optimalDistribution.message || `Distribution impossible avec ${totalPlayers} joueurs et ${maxPlayersPerGroup} joueurs max par groupe.`}
                                        </span>
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {mode === "previous" && previousRound && (
                        <div className="flex flex-col gap-4 flex-1 min-h-0">
                            {previousStandings.length === 0 ? (
                                <Alert>
                                    <InformationCircleIcon className="h-4 w-4" />
                                    <AlertDescription>
                                        La Série {previousRound.round_number} n'a pas de matchs joués.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <Alert>
                                        <InformationCircleIcon className="h-4 w-4" />
                                        <AlertDescription>
                                            <span>Groupes generés depuis la <strong>Série {previousRound.round_number}</strong>{newPlayers.length > 0 && <> avec <strong>{newPlayers.length}</strong> nouveau{newPlayers.length > 1 ? "x" : ""} joueur{newPlayers.length > 1 ? "s" : ""}</>}.</span>
                                            <span>Ajustez avec le drag &amp; drop dans la colonne Proposition.</span>
                                        </AlertDescription>
                                    </Alert>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 flex-1 min-h-0 overflow-y-auto items-start">
                                        {/* Column 1: Previous event standings */}
                                        <StaticGroupColumn
                                            title={`Classement - Série ${previousRound.round_number}`}
                                            groups={previousGroups}
                                            maxRows={maxRows}
                                            sortPlayers={(a, b) => (standingsPointsMap.get(b.id) ?? 0) - (standingsPointsMap.get(a.id) ?? 0)}
                                            renderPlayer={(player) => (
                                                <GroupPlayerRow
                                                    player={player}
                                                    moveType={moveMap.get(player.id)}
                                                    departed={unregisteredFromPrevious.has(player.id)}
                                                    trailing={`${standingsPointsMap.get(player.id) ?? 0} pts`}
                                                />
                                            )}
                                        />

                                        {/* Colonne 2 : promotions seules, personne n'est retire */}
                                        {promotionOnlyGroups && (
                                            <StaticGroupColumn
                                                title="1. Promotions"
                                                titleExtra={
                                                    <Badge variant="inactive" className="cursor-default shrink-0">
                                                        <ArrowLeftRightIcon className="h-3 w-3 mr-1" />
                                                        {promotionResult.moves.length}
                                                    </Badge>
                                                }
                                                groups={promotionOnlyGroups}
                                                sortPlayers={sortByPlacement}
                                                maxRows={maxRows}
                                                renderPlayer={(player) => (
                                                    <GroupPlayerRow
                                                        player={player}
                                                        moveType={moveMap.get(player.id)}
                                                        departed={unregisteredFromPrevious.has(player.id)}
                                                        trailing={`R${player.power_ranking || "-"}`}
                                                    />
                                                )}
                                            />
                                        )}

                                        {/* Colonne 3 : retrait des non-reinscrits, avec redistribution eventuelle */}
                                        {afterDepartureGroups && (
                                            <StaticGroupColumn
                                                title="2. Départs"
                                                titleExtra={
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="inactive" className="cursor-default shrink-0">
                                                                <UserRemove01Icon className="h-3 w-3 mr-1" />
                                                                {departedPlayers.length}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        {departedPlayers.length > 0 && (
                                                            <TooltipContent className="bg-gray-300 text-gray-900">
                                                                <div className="space-y-0.5">
                                                                    {departedPlayers.map(p => (
                                                                        <div key={p.id}>{p.first_name} {p.last_name}</div>
                                                                    ))}
                                                                </div>
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                }
                                                groups={afterDepartureGroups}
                                                sortPlayers={sortByPlacement}
                                                maxRows={maxRows}
                                                renderPlayer={(player) => {
                                                    const departed = unregisteredFromPrevious.has(player.id)
                                                    return (
                                                        <GroupPlayerRow
                                                            player={player}
                                                            moveType={moveMap.get(player.id)}
                                                            departed={departed}
                                                            trailing={departed ? "" : `R${player.power_ranking || "-"}`}
                                                        />
                                                    )
                                                }}
                                            />
                                        )}

                                        {/* Column 3: Proposed groups with new players (DnD) */}
                                        {proposedLocalGroups && (
                                            <div className="space-y-3 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mr-3">
                                                    <h4 className="text-sm font-semibold text-muted-foreground truncate ml-3">3. Proposition</h4>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="inactive" className="cursor-default shrink-0">
                                                                <UserAdd01Icon className="h-3 w-3 mr-1" />
                                                                {newPlayers.length}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        {newPlayers.length > 0 && (
                                                            <TooltipContent className="bg-gray-300 text-gray-900">
                                                                <div className="space-y-0.5">
                                                                    {newPlayers.map(p => (
                                                                        <div key={p.id} className="flex items-center justify-between gap-3">
                                                                            <span>{p.first_name} {p.last_name}</span>
                                                                            <span className="opacity-60">R{p.power_ranking || "-"}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </div>
                                                <ProposedGroups
                                                    groups={proposedLocalGroups}
                                                    onGroupsChanged={setProposedLocalGroups}
                                                    previousPlayerIds={previousPlayerIds}
                                                    maxRows={maxRows}
                                                    moveMap={moveMap}
                                                    newPlayers={newPlayers}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {mode === "manual" && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="numberOfGroups">Nombre de groupes</Label>
                                <Input
                                    id="numberOfGroups"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={numberOfGroups}
                                    onChange={(e) => setNumberOfGroups(parseInt(e.target.value) || 1)}
                                />
                            </div>
                            <Alert>
                                <InformationCircleIcon className="h-4 w-4" />
                                <AlertDescription>
                                    {numberOfGroups} groupe{numberOfGroups > 1 ? "s" : ""} vide{numberOfGroups > 1 ? "s" : ""} de {maxPlayersPerGroup} places maximum
                                    <br />
                                    <span className="text-xs text-gray-500">
                                        Vous pourrez ajouter les joueurs manuellement après création
                                    </span>
                                </AlertDescription>
                            </Alert>
                        </>
                    )}


                </div>
            ) : managementMode ? (
                /* Mode gestion drag-and-drop */
                <GroupDndManager
                    initialGroups={groups}
                    eventId={round.id}
                    onFinish={(updatedGroups) => {
                        onGroupsChanged(updatedGroups)
                        setManagementMode(false)
                    }}
                    onCancel={() => setManagementMode(false)}
                />
            ) : (
                /* Aperçu round-robin avec dates */
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {groups.length} groupe{groups.length > 1 ? "s" : ""} créé{groups.length > 1 ? "s" : ""}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => setManagementMode(true)}
                            >
                                <ArrowLeftRightIcon className="h-4 w-4" />
                                Gérer les groupes
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleDeleteGroups}
                                disabled={isLoading}
                            >
                                <Delete02Icon className="h-4 w-4" />
                                Supprimer
                            </Button>
                        </div>
                    </div>

                    {playerMovements && previousRound && (
                        <MovementLegend previousRoundNumber={previousRound.round_number} movements={playerMovements} />
                    )}

                    <GroupRoundPreview round={round} groups={groups} playerAbsences={playerAbsences} playerMovements={playerMovements} />
                </div>
            )}

            {/* Navigation (cachée en mode management et en mode section) */}
            {!managementMode && (onNext || onPrevious) && (
                <div className="flex justify-between pt-6">
                    <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                        <ArrowLeft01Icon className="h-4 w-4" />
                        Précédent
                    </Button>
                    <Button
                        type="button"
                        size="lg"
                        onClick={onNext}
                        disabled={!hasGroups || !hasPlayers || !validateGroups(groups).valid}
                    >
                        Suivant
                        <ArrowRight01Icon className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}

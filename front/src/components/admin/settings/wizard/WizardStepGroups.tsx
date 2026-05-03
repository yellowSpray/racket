import { GroupRoundPreview } from "./GroupRoundPreview"
import type { Event } from "@/types/event"
import { transformGroups, type Group, type GroupPlayer } from "@/types/draw"
import type { GroupStandings, PromotionResult } from "@/types/ranking"
import { useGroups } from "@/hooks/useGroups"
import { usePlayers } from "@/contexts/PlayersContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useAuth } from "@/contexts/AuthContext"
import { usePreviousEvent } from "@/hooks/usePreviousEvent"
import { supabase } from "@/lib/supabaseClient"
import { calculateOptimalDistribution, calculateAllDistributions } from "@/lib/groupDistributionCalculator"
import { distributePlayersByRanking } from "@/lib/groupDistribution"
import { calculateGroupStandings } from "@/lib/rankingEngine"
import { calculatePromotions } from "@/lib/promotionEngine"
import { buildProposedGroups } from "@/lib/buildProposedGroups"
import { useEffect, useState, useMemo } from "react"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GroupDndManager } from "./GroupDndManager"
import { ProposedGroups } from "./ProposedGroups"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { validateGroups } from "@/lib/groupPlayerMove"
import { sortGroupsByName } from "@/lib/utils"
import { InformationCircleIcon, SparklesIcon, Settings01Icon, ArrowLeftRightIcon, Delete02Icon, UserGroupIcon, Award01Icon, Tick02Icon, ChartIncreaseIcon, ChartDecreaseIcon, UserRemove01Icon, UserAdd01Icon } from "hugeicons-react"

interface WizardStepGroupsProps {
    event: Event
    groups: Group[]
    eventPlayerIds: Set<string>
    onGroupsChanged: (groups: Group[]) => void
    onNext: () => void
    onPrevious: () => void
}

type CreationMode = "auto" | "manual" | "previous"

/** Static column showing groups with uniform row heights */
function StaticGroupColumn({ title, titleExtra, groups, maxRows, renderPlayer, sortPlayers }: {
    title: string
    titleExtra?: React.ReactNode
    groups: Group[]
    maxRows: number
    renderPlayer: (player: GroupPlayer, group: Group) => React.ReactNode
    sortPlayers?: (a: GroupPlayer, b: GroupPlayer) => number
}) {
    return (
        <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2 mr-3">
                <h4 className="text-sm font-semibold text-muted-foreground truncate ml-3">{title}</h4>
                {titleExtra}
            </div>
            {groups.map(group => {
                const players = sortPlayers ? [...(group.players || [])].sort(sortPlayers) : (group.players || [])
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

export function WizardStepGroups({ event, groups, eventPlayerIds, onGroupsChanged, onNext, onPrevious }: WizardStepGroupsProps) {
    const { createGroups, assignPlayersToGroup, loading: groupsLoading } = useGroups()
    const { players } = usePlayers()
    const { profile } = useAuth()
    const { clubConfig, scoringRules, promotionRules, fetchClubConfig, defaultScoring, defaultPromotion } = useClubConfig()
    const { previousEvent, previousGroups, previousMatches, loading: prevLoading, fetchPreviousEvent } = usePreviousEvent()

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

    // Fetch previous event au mount pour savoir s'il existe
    useEffect(() => {
        if (profile?.club_id && !previousEvent && !prevLoading) {
            fetchPreviousEvent(profile.club_id, event.id)
        }
    }, [profile?.club_id, event.id, previousEvent, prevLoading, fetchPreviousEvent])

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
        if (!previousEvent || previousGroups.length === 0) return []
        return previousGroups.map(group => {
            const groupMatches = previousMatches.filter(m => m.group_id === group.id)
            const groupPlayers = (group.players || []).map(p => ({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
            }))
            return calculateGroupStandings(groupMatches, group.id, group.group_name, groupPlayers, effectiveScoringRules)
        })
    }, [previousEvent, previousGroups, previousMatches, effectiveScoringRules])

    const activePlayers = players.filter(p => eventPlayerIds.has(p.id))

    const registeredPlayerIds = useMemo(
        () => new Set(activePlayers.map(p => p.id)),
        [activePlayers]
    )

    const promotionResult: PromotionResult = useMemo(() => {
        if (previousStandings.length === 0) return { moves: [], stayingPlayers: [] }
        const groupOrder = previousGroups.map(g => g.id)
        return calculatePromotions(previousStandings, effectivePromotionRules, groupOrder)
    }, [previousStandings, previousGroups, effectivePromotionRules])

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

    // Column 2: groups after promotions/relegations WITHOUT new players, but with departed players shown
    const afterPromotionGroups = useMemo(() => {
        if (previousStandings.length === 0 || previousMatches.length === 0) return null
        // Build clean groups (without departed players)
        const cleanGroups = buildProposedGroups(previousGroups, previousStandings, promotionResult, registeredPlayerIds, [], maxPlayersPerGroup)
        if (!cleanGroups) return null

        // Collect departed players per original group (before promo/releg)
        const departedByGroup = new Map<number, GroupPlayer[]>()
        for (let i = 0; i < previousGroups.length; i++) {
            const departed = (previousGroups[i].players || []).filter(p => !registeredPlayerIds.has(p.id))
            if (departed.length > 0) {
                departedByGroup.set(i, departed)
            }
        }

        // Inject departed players back into their original group index
        return cleanGroups.map((group, i) => {
            const departed = departedByGroup.get(i)
            if (!departed) return group
            return { ...group, players: [...(group.players || []), ...departed] }
        })
    }, [previousGroups, previousStandings, previousMatches, promotionResult, registeredPlayerIds, maxPlayersPerGroup])

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

        return built.map(group => {
            const players = [...(group.players || [])]
            players.sort((a, b) => {
                const order = (id: string) => {
                    const mt = moveMap.get(id)
                    if (mt === "relegation") return 0
                    if (mt === "promotion") return 2
                    return 1
                }
                return order(a.id) - order(b.id)
            })
            return { ...group, players }
        })
    }, [previousGroups, previousStandings, previousMatches, promotionResult, registeredPlayerIds, maxPlayersPerGroup, moveMap])

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

        // Aplatir les joueurs dans leur ordre actuel depuis autoProposedGroups
        // (promo/relg déjà appliqués + tri moveMap déjà fait → classement respecté)
        const orderedPlayers = autoProposedGroups.flatMap(g => g.players || [])

        // Répartir équitablement sur targetGroupCount groupes
        const perGroup = Math.floor(orderedPlayers.length / targetGroupCount)
        const remainder = orderedPlayers.length % targetGroupCount
        const eventId = autoProposedGroups[0]?.event_id ?? event.id
        const result: Group[] = []
        let playerIdx = 0

        for (let i = 0; i < targetGroupCount; i++) {
            const slotCount = i < remainder ? perGroup + 1 : perGroup
            result.push({
                id: `proposed-new-${i}`,
                event_id: eventId,
                group_name: `Box ${i + 1}`,
                max_players: maxPlayersPerGroup,
                created_at: "",
                players: orderedPlayers.slice(playerIdx, playerIdx + slotCount),
            })
            playerIdx += slotCount
        }

        return result
    }, [autoProposedGroups, newPlayers, maxPlayersPerGroup, event.id])

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
                event_id: event.id,
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
            // fetchGroupsByEvent calls that would re-render with DB order and break player ordering)
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
                event_id: event.id,
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
            await createGroups(event.id, numberOfGroups, maxPlayersPerGroup)
            const { data } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("event_id", event.id)
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
            const groupsToCreate = selectedDistribution.distribution.map((_count, index) => ({
                event_id: event.id,
                group_name: `Box ${index + 1}`,
                max_players: maxPlayersPerGroup,
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
                return playerIds.length > 0 ? assignPlayersToGroup(groupId, playerIds, event.id) : Promise.resolve()
            }))

            const { data } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("event_id", event.id)
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
                .eq("event_id", event.id)

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
        <div className="py-4">
            {!hasGroups ? (
                /* Mode creation de groupes */
                <div className="grid gap-4">
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
                            {previousEvent && (
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
                                        {" "}— choisissez une configuration :
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

                    {mode === "previous" && previousEvent && (
                        <div className="space-y-4">
                            {previousStandings.length === 0 ? (
                                <Alert>
                                    <InformationCircleIcon className="h-4 w-4" />
                                    <AlertDescription>
                                        Le box precedent ({previousEvent.event_name}) n'a pas de matchs joues.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <Alert>
                                        <InformationCircleIcon className="h-4 w-4" />
                                        <AlertDescription>
                                            <span>Groupes generés depuis <strong>{previousEvent.event_name}</strong>{newPlayers.length > 0 && <> avec <strong>{newPlayers.length}</strong> nouveau{newPlayers.length > 1 ? "x" : ""} joueur{newPlayers.length > 1 ? "s" : ""}</>}.</span>
                                            <span>Ajustez avec le drag &amp; drop dans la colonne Proposition.</span>
                                        </AlertDescription>
                                    </Alert>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-h-[450px] overflow-y-auto">
                                        {/* Column 1: Previous event standings */}
                                        <StaticGroupColumn
                                            title={`Classement - ${previousEvent.event_name}`}
                                            groups={previousGroups}
                                            maxRows={maxRows}
                                            sortPlayers={(a, b) => (standingsPointsMap.get(b.id) ?? 0) - (standingsPointsMap.get(a.id) ?? 0)}
                                            renderPlayer={(player) => {
                                                const moveType = moveMap.get(player.id)
                                                const isUnregistered = unregisteredFromPrevious.has(player.id)
                                                return (
                                                    <div className={`flex items-center justify-between w-full text-sm px-2 py-1.5 rounded border ${
                                                        isUnregistered ? "bg-gray-50 opacity-50 border-gray-200"
                                                            : moveType === "promotion" ? "bg-emerald-50 border-emerald-200"
                                                            : moveType === "relegation" ? "bg-red-50 border-red-200"
                                                            : "border-gray-200"
                                                    }`}>
                                                        <span className="flex items-center gap-2">
                                                            <span className={isUnregistered ? "line-through text-muted-foreground" : ""}>
                                                                {player.first_name} {player.last_name}
                                                            </span>
                                                            {isUnregistered && <UserRemove01Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                                                            {!isUnregistered && moveType === "promotion" && <ChartIncreaseIcon className="h-3.5 w-3.5 text-emerald-600" />}
                                                            {!isUnregistered && moveType === "relegation" && <ChartDecreaseIcon className="h-3.5 w-3.5 text-red-500" />}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{standingsPointsMap.get(player.id) ?? 0} pts</span>
                                                    </div>
                                                )
                                            }}
                                        />

                                        {/* Column 2: After promotions (no new players) */}
                                        {afterPromotionGroups && (
                                            <StaticGroupColumn
                                                title="Après promotions + départs"
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
                                                groups={afterPromotionGroups}
                                                sortPlayers={(a, b) => {
                                                    const order = (id: string) => {
                                                        if (unregisteredFromPrevious.has(id)) return 2
                                                        const mt = moveMap.get(id)
                                                        if (mt === "relegation") return -1
                                                        if (mt === "promotion") return 1
                                                        return 0
                                                    }
                                                    return order(a.id) - order(b.id)
                                                }}
                                                maxRows={maxRows}
                                                renderPlayer={(player) => {
                                                    const isUnregistered = unregisteredFromPrevious.has(player.id)
                                                    const moveType = moveMap.get(player.id)
                                                    return (
                                                        <div className={`flex items-center justify-between w-full text-sm px-2 py-1.5 rounded border ${
                                                            isUnregistered ? "bg-gray-50 opacity-50 border-gray-200"
                                                                : moveType === "promotion" ? "bg-emerald-50 border-emerald-200"
                                                                : moveType === "relegation" ? "bg-red-50 border-red-200"
                                                                : "border-gray-200"
                                                        }`}>
                                                            <span className="flex items-center gap-2">
                                                                <span className={isUnregistered ? "line-through text-muted-foreground" : ""}>
                                                                    {player.first_name} {player.last_name}
                                                                </span>
                                                                {isUnregistered && <UserRemove01Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                                                                {!isUnregistered && moveType === "promotion" && <ChartIncreaseIcon className="h-3.5 w-3.5 text-emerald-600" />}
                                                                {!isUnregistered && moveType === "relegation" && <ChartDecreaseIcon className="h-3.5 w-3.5 text-red-500" />}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">{isUnregistered ? "" : `R${player.power_ranking || "-"}`}</span>
                                                        </div>
                                                    )
                                                }}
                                            />
                                        )}

                                        {/* Column 3: Proposed groups with new players (DnD) */}
                                        {proposedLocalGroups && (
                                            <div className="space-y-3 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mr-3">
                                                    <h4 className="text-sm font-semibold text-muted-foreground truncate ml-3">Proposition</h4>
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
                    eventId={event.id}
                    onFinish={(updatedGroups) => {
                        onGroupsChanged(updatedGroups)
                        setManagementMode(false)
                    }}
                    onCancel={() => setManagementMode(false)}
                />
            ) : (
                /* Aperçu round-robin avec dates */
                <div className="grid gap-4">
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

                    <GroupRoundPreview event={event} groups={groups} />
                </div>
            )}

            {/* Navigation (caché en mode management) */}
            {!managementMode && (
                <div className="flex justify-between pt-6">
                    <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                        Précédent
                    </Button>
                    <Button
                        type="button"
                        size="lg"
                        onClick={onNext}
                        disabled={!hasGroups || !hasPlayers || !validateGroups(groups).valid}
                    >
                        Suivant
                    </Button>
                </div>
            )}
        </div>
    )
}

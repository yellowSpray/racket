import type { Event } from "@/types/event"
import { transformGroups, type Group, type GroupPlayer, type SupabaseGroup } from "@/types/draw"
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
import { PreviousBoxPreview } from "./PreviousBoxPreview"
import { ProposedGroups } from "./ProposedGroups"
import { Badge } from "@/components/ui/badge"
import { validateGroups } from "@/lib/groupPlayerMove"
import { InformationCircleIcon, SparklesIcon, Settings01Icon, ArrowLeftRightIcon, Delete02Icon, UserGroupIcon, Award01Icon } from "hugeicons-react"

interface WizardStepGroupsProps {
    event: Event
    groups: Group[]
    onGroupsChanged: (groups: Group[]) => void
    onNext: () => void
    onPrevious: () => void
}

type CreationMode = "auto" | "manual" | "previous"

export function WizardStepGroups({ event, groups, onGroupsChanged, onNext, onPrevious }: WizardStepGroupsProps) {
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

    // Fetch previous event when switching to "previous" mode
    useEffect(() => {
        if (mode === "previous" && profile?.club_id && !previousEvent && !prevLoading) {
            fetchPreviousEvent(profile.club_id, event.id)
        }
    }, [mode, profile?.club_id, event.id, previousEvent, prevLoading, fetchPreviousEvent])

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

    const activePlayers = players.filter(p => p.status?.includes("active"))

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

    // Compute proposed groups as a memo so it always reflects the latest data
    const autoProposedGroups = useMemo(() => {
        if (previousStandings.length === 0 || previousMatches.length === 0) return null
        return buildProposedGroups(previousGroups, previousStandings, promotionResult, registeredPlayerIds, newPlayers, maxPlayersPerGroup)
    }, [previousGroups, previousStandings, previousMatches, promotionResult, registeredPlayerIds, newPlayers, maxPlayersPerGroup])

    // Set initial proposed groups from auto-computation (only when user hasn't modified via DnD)
    useEffect(() => {
        if (mode === "previous" && autoProposedGroups && !proposedLocalGroups) {
            setProposedLocalGroups(autoProposedGroups)
        }
    }, [mode, autoProposedGroups, proposedLocalGroups])

    const totalPlayers = activePlayers.length
    const optimalDistribution = calculateOptimalDistribution(totalPlayers, maxPlayersPerGroup)
    const allDistributions = calculateAllDistributions(totalPlayers, maxPlayersPerGroup)
    const selectedDistribution = allDistributions[selectedDistributionIndex] ?? allDistributions[0]



    const hasGroups = groups.length > 0
    const hasPlayers = groups.some(g => (g.players || []).length > 0)

    const handleApplyFromPrevious = async () => {
        if (!proposedLocalGroups || proposedLocalGroups.length === 0) return

        clearError()
        setCreating(true)

        try {
            // Create groups in DB for the new event
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

            // Assign players to their respective groups
            for (let i = 0; i < proposedLocalGroups.length; i++) {
                const groupId = createdGroupsData[i].id
                const playerIds = (proposedLocalGroups[i].players || []).map(p => p.id)
                if (playerIds.length > 0) {
                    await assignPlayersToGroup(groupId, playerIds, event.id)
                }
            }

            // Re-fetch final state
            const { data } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("event_id", event.id)
                .order("group_name")

            if (data) {
                const transformed = transformGroups(data)
                onGroupsChanged(transformed)
            }
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
            // Re-fetch to get updated groups and pass them up
            const { data } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("event_id", event.id)
                .order("group_name")

            if (data) {
                const transformed = transformGroups(data)
                onGroupsChanged(transformed)
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

            for (let i = 0; i < distributedGroups.length; i++) {
                const groupId = createdGroupsData[i].id
                const playerIds = distributedGroups[i].map(p => p.id)
                if (playerIds.length > 0) {
                    await assignPlayersToGroup(groupId, playerIds, event.id)
                }
            }

            // Re-fetch final state
            const { data } = await supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("event_id", event.id)
                .order("group_name")

            if (data) {
                const transformed = transformGroups(data)
                onGroupsChanged(transformed)
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
            // Supprimer tous les groupes de l'evenement
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
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant={mode === "auto" ? "default" : "outline"}
                            size="sm"
                            onClick={() => { setMode("auto"); setProposedLocalGroups(null) }}
                        >
                            <SparklesIcon className="mr-2 h-4 w-4" />
                            Auto
                        </Button>
                        <Button
                            type="button"
                            variant={mode === "manual" ? "default" : "outline"}
                            size="sm"
                            onClick={() => { setMode("manual"); setProposedLocalGroups(null) }}
                        >
                            <Settings01Icon className="mr-2 h-4 w-4" />
                            Manuel
                        </Button>
                        <Button
                            type="button"
                            variant={mode === "previous" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMode("previous")}
                        >
                            <Award01Icon className="mr-2 h-4 w-4" />
                            Box precedent
                        </Button>
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

                    {mode === "previous" && (
                        <div className="space-y-4">
                            {prevLoading ? (
                                <Alert>
                                    <InformationCircleIcon className="h-4 w-4" />
                                    <AlertDescription>Chargement du box precedent...</AlertDescription>
                                </Alert>
                            ) : !previousEvent ? (
                                <Alert variant="destructive">
                                    <InformationCircleIcon className="h-4 w-4" />
                                    <AlertDescription>Aucun box precedent trouve pour ce club.</AlertDescription>
                                </Alert>
                            ) : previousStandings.length === 0 ? (
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
                                            Groupes generes depuis <strong>{previousEvent.event_name}</strong> avec {promotionResult.moves.length} mouvement{promotionResult.moves.length > 1 ? "s" : ""} (promo/releg).
                                            Ajustez avec le drag & drop a droite.
                                        </AlertDescription>
                                    </Alert>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                                        <PreviousBoxPreview
                                            standings={previousStandings}
                                            promotionResult={promotionResult}
                                            previousEventName={previousEvent.event_name}
                                            registeredPlayerIds={registeredPlayerIds}
                                        />
                                        {proposedLocalGroups && (
                                            <ProposedGroups
                                                groups={proposedLocalGroups}
                                                onGroupsChanged={setProposedLocalGroups}
                                                previousPlayerIds={previousPlayerIds}
                                            />
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


                    <div className="flex gap-2">
                        {mode === "manual" && (
                            <Button type="button" onClick={handleCreateEmpty} disabled={isLoading}>
                                Créer vides
                            </Button>
                        )}
                        {mode === "auto" && (
                            <Button
                                type="button"
                                onClick={handleGenerateAuto}
                                disabled={isLoading || !selectedDistribution || totalPlayers === 0}
                            >
                                <SparklesIcon className="mr-2 h-4 w-4" />
                                Générer automatiquement
                            </Button>
                        )}
                        {mode === "previous" && proposedLocalGroups && proposedLocalGroups.length > 0 && (
                            <Button
                                type="button"
                                onClick={handleApplyFromPrevious}
                                disabled={isLoading}
                            >
                                <Award01Icon className="mr-2 h-4 w-4" />
                                Appliquer les groupes
                            </Button>
                        )}
                    </div>
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
                /* Affichage résumé des groupes */
                <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {groups.length} groupe{groups.length > 1 ? "s" : ""} créé{groups.length > 1 ? "s" : ""}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setManagementMode(true)}
                            >
                                <ArrowLeftRightIcon className="mr-2 h-4 w-4" />
                                Gérer les groupes
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDeleteGroups}
                                disabled={isLoading}
                            >
                                <Delete02Icon className="mr-2 h-4 w-4" />
                                Supprimer
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                        {groups.map(group => (
                            <div key={group.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-sm">{group.group_name}</h4>
                                    <Badge variant="default">
                                        <UserGroupIcon className="h-3 w-3 mr-1" />
                                        {(group.players || []).length}/{group.max_players}
                                    </Badge>
                                </div>
                                {(group.players || []).length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Aucun joueur</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {(group.players || []).map((player, index) => (
                                            <li key={player.id} className="flex items-center justify-between text-sm">
                                                <span>
                                                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                                                    {player.first_name} {player.last_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    R{player.power_ranking || "-"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>

                </div>
            )}

            {/* Navigation (caché en mode management) */}
            {!managementMode && (
                <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline" onClick={onPrevious}>
                        Précédent
                    </Button>
                    <Button
                        type="button"
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


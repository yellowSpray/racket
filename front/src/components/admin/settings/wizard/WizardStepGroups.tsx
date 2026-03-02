import type { Event } from "@/types/event"
import type { Group, GroupPlayer, SupabaseGroup } from "@/types/draw"
import { useGroups } from "@/hooks/useGroups"
import { usePlayers } from "@/contexts/PlayersContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabaseClient"
import { calculateOptimalDistribution } from "@/lib/groupDistributionCalculator"
import { distributePlayersByRanking } from "@/lib/groupDistribution"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GroupDndManager } from "./GroupDndManager"
import { Badge } from "@/components/ui/badge"
import { validateGroups } from "@/lib/groupPlayerMove"
import { Info, Sparkles, Settings, ArrowLeftRight, Trash2, Users } from "lucide-react"

interface WizardStepGroupsProps {
    event: Event
    groups: Group[]
    onGroupsChanged: (groups: Group[]) => void
    onNext: () => void
    onPrevious: () => void
}

export function WizardStepGroups({ event, groups, onGroupsChanged, onNext, onPrevious }: WizardStepGroupsProps) {
    const { createGroups, assignPlayersToGroup, loading: groupsLoading } = useGroups()
    const { players } = usePlayers()
    const { profile } = useAuth()
    const { clubConfig, fetchClubConfig } = useClubConfig()

    const [manualMode, setManualMode] = useState(false)
    const [numberOfGroups, setNumberOfGroups] = useState(3)
    const [error, setError] = useState<string | null>(null)
    const [managementMode, setManagementMode] = useState(false)
    const [creating, setCreating] = useState(false)

    const maxPlayersPerGroup = clubConfig?.default_max_players_per_group ?? 6

    useEffect(() => {
        if (profile?.club_id) {
            fetchClubConfig(profile.club_id)
        }
    }, [profile?.club_id, fetchClubConfig])

    const activePlayers = players.filter(p => p.status?.includes("active"))
    const totalPlayers = activePlayers.length
    const optimalDistribution = calculateOptimalDistribution(totalPlayers, maxPlayersPerGroup)



    const hasGroups = groups.length > 0
    const hasPlayers = groups.some(g => (g.players || []).length > 0)

    const handleCreateEmpty = async () => {
        if (!manualMode) return
        setError(null)
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
            setError(err instanceof Error ? err.message : "Erreur lors de la création")
        } finally {
            setCreating(false)
        }
    }

    const handleGenerateAuto = async () => {
        if (activePlayers.length === 0) {
            setError("Pas assez de joueurs actifs")
            return
        }

        if (!optimalDistribution.valid) {
            setError(optimalDistribution.message || "Distribution impossible")
            return
        }

        setError(null)
        setCreating(true)

        try {
            const groupsToCreate = optimalDistribution.distribution.map((_count, index) => ({
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
                optimalDistribution.numberOfGroups
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
            setError(err instanceof Error ? err.message : "Erreur lors de la génération")
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
            setError(err instanceof Error ? err.message : "Erreur lors de la suppression")
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
                            variant={!manualMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setManualMode(false)}
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Auto
                        </Button>
                        <Button
                            type="button"
                            variant={manualMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setManualMode(true)}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Manuel
                        </Button>
                    </div>

                    {!manualMode && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{totalPlayers} joueurs actifs</strong> seront répartis automatiquement
                                {optimalDistribution.valid && (
                                    <>
                                        <br />
                                        <span className="text-sm font-semibold text-blue-700">
                                            {optimalDistribution.numberOfGroups} groupe{optimalDistribution.numberOfGroups > 1 ? "s" : ""} :{" "}
                                            {optimalDistribution.distribution.map((n, i) => (
                                                <span key={i}>
                                                    Box {i + 1} ({n} joueurs)
                                                    {i < optimalDistribution.distribution.length - 1 ? ", " : ""}
                                                </span>
                                            ))}
                                        </span>
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {manualMode && (
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
                                <Info className="h-4 w-4" />
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

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-2">
                        {manualMode ? (
                            <Button type="button" onClick={handleCreateEmpty} disabled={isLoading}>
                                Créer vides
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleGenerateAuto}
                                disabled={isLoading || !optimalDistribution.valid || totalPlayers === 0}
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Générer automatiquement
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
                                <ArrowLeftRight className="mr-2 h-4 w-4" />
                                Gérer les groupes
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDeleteGroups}
                                disabled={isLoading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
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
                                        <Users className="h-3 w-3 mr-1" />
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

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
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

function transformGroups(data: SupabaseGroup[]): Group[] {
    return data.map(g => ({
        id: g.id,
        event_id: g.event_id,
        group_name: g.group_name,
        max_players: g.max_players,
        created_at: g.created_at,
        players: (g.group_players || [])
            .filter(gp => gp.profiles)
            .map(gp => ({
                id: gp.profiles.id,
                first_name: gp.profiles.first_name,
                last_name: gp.profiles.last_name,
                phone: gp.profiles.phone,
                power_ranking: gp.profiles.power_ranking || "0",
            })),
    }))
}

import { useEvent } from "@/contexts/EventContext"
import { usePlayers } from "@/contexts/PlayersContext"
import { useGroups } from "@/hooks/useGroups"
import { supabase } from "@/lib/supabaseClient"
import { calculateOptimalDistribution } from "@/lib/groupDistributionCalculator"
import { distributePlayersByRanking } from "@/lib/groupDistribution"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InformationCircleIcon, SparklesIcon, Settings01Icon } from "hugeicons-react"
import type { GroupPlayer } from "@/types/draw"

interface CreateGroupsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateGroupsDialog({ open , onOpenChange }: CreateGroupsDialogProps) {
    const { currentEvent } = useEvent()
  const { createGroups, assignPlayersToGroup, loading } = useGroups()
  const { players, fetchPlayersByEvent } = usePlayers()
  
  const [manualMode, setManualMode] = useState(false)
  const [numberOfGroups, setNumberOfGroups] = useState(3)
  const [error, setError] = useState<string | null>(null)

    // charger les joueurs actifs
    useEffect(() => {
        if (open && currentEvent) {
            fetchPlayersByEvent(currentEvent.id)
        }
    }, [open, currentEvent, fetchPlayersByEvent])

    // nombre de joueurs actifs
    const activePlayers = players.filter(p => p.status?.includes("active"))
    const totalPlayers = activePlayers.length

    // calcul automatique de la distribution optimale
    const optimalDistribution = calculateOptimalDistribution(totalPlayers)

    const handleCreateEmpty = async () => {
        if(!currentEvent) return
        if (!manualMode) return

        setError(null)
        
        try {
            // en mode manuel, créer des groupes vides de 6 max
            await createGroups(currentEvent.id, numberOfGroups, 6)
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de la creation")
        }
    }

    const handleGenerateAuto = async () => {

        if(!currentEvent) return
        if(activePlayers.length === 0) {
            setError("Pas assez de joueurs actif")
            return
        }

        if (!optimalDistribution.valid) {
            setError(optimalDistribution.message || "Distribution impossible")
            return
        }

        setError(null)

        try {
            // créer les groupes avec les bonnes tailles
            const groupsToCreate = optimalDistribution.distribution.map((maxPlayers, index) => ({
                event_id: currentEvent.id,
                group_name: `Box ${index + 1}`,
                max_players: maxPlayers
            }))

            const { data: createdGroupsData, error: insertError } = await supabase
                .from("groups")
                .insert(groupsToCreate)
                .select()

            if (insertError) {
                throw new Error(insertError.message)
            }

            // distribuer les joueurs par ranking
            const playersForDistribution: GroupPlayer[] = activePlayers.map(p => ({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
                phone: p.phone,
                power_ranking: p.power_ranking
            }))

            const distributedGroups = distributePlayersByRanking(
                playersForDistribution,
                optimalDistribution.numberOfGroups
            )

            // 3. Assigner les joueurs aux groupes en parallèle
            if (!createdGroupsData || createdGroupsData.length < distributedGroups.length) {
                throw new Error("Le nombre de groupes créés ne correspond pas à la distribution")
            }

            await Promise.all(
                distributedGroups.map((group, i) => {
                    const playerIds = group.map(p => p.id)
                    if (playerIds.length > 0) {
                        return assignPlayersToGroup(createdGroupsData[i].id, playerIds, currentEvent.id)
                    }
                })
            )

            onOpenChange(false)

        } catch (err) {
            console.error("Erreur génération auto:", err)
            setError(err instanceof Error ? err.message : "Erreur lors de la génération")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                    <DialogTitle>Créer les tableaux</DialogTitle>
                    <DialogDescription>
                        Distribution automatique ou configuration manuelle
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* mode : Auto vs Manuel */}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant={!manualMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setManualMode(false)}
                        >
                            <SparklesIcon className="mr-2 h-4 w-4" />
                            Auto
                        </Button>
                        <Button
                            type="button"
                            variant={manualMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setManualMode(true)}
                        >
                            <Settings01Icon className="mr-2 h-4 w-4" />
                            Manuel
                        </Button>
                    </div>

                    {/* Mode AUTO */}
                    {!manualMode && (
                        <Alert>
                            <InformationCircleIcon className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{totalPlayers} joueurs actifs</strong> seront répartis automatiquement
                                {optimalDistribution.valid && (
                                    <>
                                        <br />
                                        <span className="text-sm font-semibold text-blue-700">
                                            {optimalDistribution.numberOfGroups} groupe{optimalDistribution.numberOfGroups > 1 ? 's' : ''} : {' '}
                                            {optimalDistribution.distribution.map((n, i) => (
                                                <span key={i}>Box {i + 1} ({n} joueurs){i < optimalDistribution.distribution.length - 1 ? ', ' : ''}</span>
                                            ))}
                                        </span>
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Mode MANUEL */}
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
                                <InformationCircleIcon className="h-4 w-4" />
                                <AlertDescription>
                                {numberOfGroups} groupe{numberOfGroups > 1 ? 's' : ''} vide{numberOfGroups > 1 ? 's' : ''} de 6 places maximum
                                <br />
                                <span className="text-xs text-gray-500">
                                    Vous pourrez ajouter les joueurs manuellement après création
                                </span>
                                </AlertDescription>
                            </Alert>
                        </>
                    )}

                    {/* Erreur */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                </div>

                <DialogFooter className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Annuler
                    </Button>
                    
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCreateEmpty}
                        disabled={loading}
                    >
                        Créer vides
                    </Button>

                    {!manualMode && (
                        <Button
                            type="button"
                            onClick={handleGenerateAuto}
                            disabled={loading || !optimalDistribution.valid || totalPlayers === 0}
                        >
                            <SparklesIcon className="mr-2 h-4 w-4" />
                            Générer automatiquement
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
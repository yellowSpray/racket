import { useEvent } from "@/contexts/EventContext"
import { usePlayers } from "@/contexts/PlayersContext"
import { useGroups } from "@/hooks/useGroups"
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
import { Card } from "@/components/ui/card"
import { ArrowRight, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Group } from "@/types/draw"

interface ManageGroupsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: Group[]
}

export function ManageGroupDialog({ open, onOpenChange, groups }: ManageGroupsDialogProps) {
    const { currentEvent } = useEvent()
    const { loading, assignPlayersToGroup, removePlayerFromGroup } = useGroups()
    const { players, fetchPlayersByEvent } = usePlayers()

    const [selectedPlayer, setSelectedPlayer] = useState<string>("")
    const [targetGroup, setTargetGroup] = useState<string>("")

    console.log("🎨 [ManageGroupsDialog] Render - open:", open)
    console.log("📊 [ManageGroupsDialog] currentEvent:", currentEvent?.event_name || "NONE")
    console.log("👥 [ManageGroupsDialog] players:", players.length)
    console.log("📦 [ManageGroupsDialog] groups:", groups.length)

    // charger les joueurs
    useEffect(() => {
        console.log("🔄 [ManageGroupsDialog] useEffect - open:", open, "currentEvent:", currentEvent?.id)

        if(open && currentEvent) {
            console.log("✅ [ManageGroupsDialog] Fetching players for event:", currentEvent.id)
            fetchPlayersByEvent(currentEvent.id)
        }
    }, [open, currentEvent])

    // Joueurs déjà dans des groupes (avec leur groupe actuel)
    const playersInGroups = new Map<string, string>()
    groups.forEach(group => {
        group.players?.forEach(player => {
            playersInGroups.set(player.id, group.id)
        })
    })

    console.log("🗺️ [ManageGroupsDialog] playersInGroups size:", playersInGroups.size)

    // Joueurs actifs de l'événement
    const activePlayers = players.filter(p => p.status?.includes("active"))

    const handleMovePlayer = async (playerId: string, fromGroupId: string | undefined, toGroupId: string) => {
        if (!currentEvent) return

        try {
            // retirer du groupe actuel si existe
            if (fromGroupId) {
                await removePlayerFromGroup(fromGroupId, playerId, currentEvent.id)
            }

            // ajouter au nouveau groupe
            await assignPlayersToGroup(toGroupId, [playerId], currentEvent.id)

            setSelectedPlayer("")
            setTargetGroup("")
        } catch (err) {
            console.error("Erreur déplacement:", err)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto bg-white">
                <DialogHeader>
                    <DialogTitle>Gérer les groupes</DialogTitle>
                    <DialogDescription>
                        Déplacez les joueurs entre les groupes
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Aperçu des groupes */}
                    <div className="grid grid-cols-2 gap-4">
                        {groups.map(group => (
                            <Card key={group.id} className="p-4">
                                <h3 className="font-bold mb-2">
                                    {group.group_name} ({group.players?.length || 0}/{group.max_players})
                                </h3>
                                <ul className="space-y-1 text-sm">
                                    {group.players?.map(player => (
                                        <li key={player.id} className="flex items-center justify-between">
                                            <span>{player.first_name} {player.last_name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                setSelectedPlayer(player.id)
                                                }}
                                            >
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    ))}
                                    {(!group.players || group.players.length === 0) && (
                                        <li className="text-gray-400 italic">Aucun joueur</li>
                                    )}
                                </ul>
                            </Card>
                        ))}
                    </div>

                    {/* Déplacement rapide */}
                    {selectedPlayer && (
                        <Card className="p-4 bg-blue-50 border-blue-200">
                            <h4 className="font-semibold mb-3">
                                Déplacer : {activePlayers.find(p => p.id === selectedPlayer)?.first_name}{' '}
                                {activePlayers.find(p => p.id === selectedPlayer)?.last_name}
                            </h4>
                            <div className="flex items-center gap-4">
                                <Select value={targetGroup} onValueChange={setTargetGroup}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Vers quel groupe ?" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {groups.map(group => {
                                            const isFull = (group.players?.length || 0) >= group.max_players
                                            const isCurrentGroup = playersInGroups.get(selectedPlayer) === group.id
                                            
                                            return (
                                                <SelectItem 
                                                    key={group.id} 
                                                    value={group.id}
                                                    disabled={isFull || isCurrentGroup}
                                                >
                                                    {group.group_name} ({group.players?.length || 0}/{group.max_players})
                                                    {isCurrentGroup && " (actuel)"}
                                                    {isFull && " (complet)"}
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>

                                <Button
                                    onClick={() => {
                                        const fromGroup = playersInGroups.get(selectedPlayer)
                                        handleMovePlayer(selectedPlayer, fromGroup, targetGroup)
                                    }}
                                    disabled={!targetGroup || loading}
                                >
                                    Déplacer
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedPlayer("")
                                        setTargetGroup("")
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
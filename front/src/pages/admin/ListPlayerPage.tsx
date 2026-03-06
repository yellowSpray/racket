import { PlayersSkeleton } from "@/components/shared/skeletons/PlayersSkeleton";
import { EditPlayers } from "@/components/admin/players/EditPlayers";
import { columns as playerColumns } from "@/components/admin/players/PlayerColumns";
import { DataTable } from "@/components/admin/players/PlayerTable";
import { EventSelector } from "@/components/admin/settings/EventSelector";
import { usePlayers } from "@/contexts/PlayersContext";
import type { PlayerType } from "@/types/player";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button";
import { useEvent } from "@/contexts/EventContext";
import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react"

export function ListPlayers() {

    const { players, addPlayer, updatePlayer, removePlayerFromEvent, loading, fetchPlayer, fetchPlayersByEvent } = usePlayers();
    const { currentEvent } = useEvent()
    const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false)
    const [statusFilter, setStatusFilter] = useState<string>("all")

    const columns = playerColumns(updatePlayer, removePlayerFromEvent, !showAllPlayers && !!currentEvent)

    useEffect(() => {
        if(showAllPlayers) {
            fetchPlayer()
        } else if (currentEvent) {
            fetchPlayersByEvent(currentEvent.id)
        }
        // Pas de fetch si !showAllPlayers && !currentEvent : le context fait déjà le fetch initial
    }, [currentEvent, showAllPlayers, fetchPlayer, fetchPlayersByEvent])

    const filteredPlayers = useMemo(() => {
        let filtered = players

        // Filtre par status
        if(statusFilter !== "all") {
            filtered = filtered.filter(player => {
                if(!player.status || player.status.length === 0) return false

                switch (statusFilter){
                    case "active":
                        return player.status.includes("active")
                    case "inactive":
                        return player.status.includes("inactive")
                    case "member":
                        return player.status.includes("member")
                    case "visitor":
                        return player.status.includes("visitor")
                    default:
                        return true
                }
            })
        }

        return filtered

    }, [players, statusFilter])

    // Loading plein écran uniquement au premier chargement (pas de joueurs encore)
    if (loading && players.length === 0) {
        return <PlayersSkeleton />
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex flex-row items-center justify-between mb-6">

                {/* Gauche : Titre + EventSelector */}
                <div className="flex flex-row items-center gap-4">
                    <h3 className="text-lg font-semibold">Joueurs</h3>
                    {!showAllPlayers && <EventSelector />}
                    <span className="text-sm text-gray-500">
                        {filteredPlayers.length} joueur{filteredPlayers.length > 1 ? "s" : ""}
                    </span>
                </div>

                {/* Droite : Actions + Filtres */}
                <div className="flex flex-row items-center gap-4">
                    <Button
                        variant={showAllPlayers ? "default" : "outline"}
                        onClick={() => setShowAllPlayers(!showAllPlayers)}
                    >
                        <Users size={20} />
                        {showAllPlayers ? "Retour à l'événement" : "Tous les joueurs"}
                    </Button>

                    {/* Bouton Ajouter */}
                    <EditPlayers mode="create" onSave={addPlayer} />

                    {/* Filtre par statut */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtre" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="inactive">Inactif</SelectItem>
                                <SelectItem value="member">Membre</SelectItem>
                                <SelectItem value="visitor">Non Membre</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

            </div>

            {/* Tableau */}
            <div className="flex-1 min-h-0">
                <DataTable columns={columns} data={filteredPlayers as PlayerType[]} />
            </div>
        </div>
    )
}
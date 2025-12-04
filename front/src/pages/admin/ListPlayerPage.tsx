import Loading from "@/components/shared/Loading";
import { EditPlayers } from "@/components/admin/players/EditPlayers";
import { columns as playerColumns } from "@/components/admin/players/Columns";
import { DataTable } from "@/components/admin/players/Datatable";
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

    const { players, addPlayer, updatePlayer, loading, fetchPlayer, fetchPlayersByEvent } = usePlayers();
    const { currentEvent } = useEvent()
    const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false)
    const [statusFilter, setStatusFilter] = useState<string>("all")

    const columns = playerColumns(updatePlayer)

    useEffect(() => {
        if(showAllPlayers) {
            fetchPlayer()
        } else if (currentEvent) {
            fetchPlayersByEvent(currentEvent.id)
        } else {
            fetchPlayer()
        }
    }, [currentEvent, showAllPlayers])

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

    if (loading) {
        return <Loading />
    }

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-4">

                {/* Gauche : Titre + EventSelector */}
                <div className="flex flex-row items-center gap-4">
                    <h2>
                        {showAllPlayers
                            ? "Tous les joueurs"
                            : currentEvent
                                ? `Joueurs - ${currentEvent.event_name}`
                                : "Liste des joueurs"
                        }
                    </h2>
                    {!showAllPlayers && <EventSelector />}
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
                        <SelectContent className="bg-white">
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

            {/* Compteur de joueurs */}
            <div className="mb-4 text-sm text-gray-500">
                {filteredPlayers.length} joueur{filteredPlayers.length > 1 ? "s" : ""} affiché{filteredPlayers.length > 1 ? "s" : ""}
            </div>

            {/* Tableau */}
            <DataTable columns={columns} data={players as PlayerType[]} />
        </>
    )
}
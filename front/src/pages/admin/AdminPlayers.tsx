import { PlayersSkeleton } from "@/components/shared/skeletons/PlayersSkeleton";
import { EditPlayers } from "@/components/admin/players/EditPlayers";
import { columns as playerColumns } from "@/components/admin/players/PlayerColumns";
import { DataTable } from "@/components/admin/players/PlayerTable";
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
import { Input } from "@/components/ui/input";
import { Search01Icon } from "hugeicons-react";
import { useEffect, useMemo, useState } from "react";

export function AdminPlayers() {

    const { players, addPlayer, updatePlayer, updatePaymentStatus, loading, fetchPlayer } = usePlayers();
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [searchFilter, setSearchFilter] = useState("")

    const columns = playerColumns(updatePlayer, updatePaymentStatus)

    useEffect(() => {
        fetchPlayer()
    }, [fetchPlayer])

    const filteredPlayers = useMemo(() => {
        if (statusFilter === "all") return players

        return players.filter(player => {
            if (!player.status || player.status.length === 0) return false

            switch (statusFilter) {
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
    }, [players, statusFilter])

    if (loading && players.length === 0) {
        return <PlayersSkeleton />
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex flex-row items-center justify-between mb-6">

                {/* Gauche : Titre */}
                <div className="flex flex-row items-center gap-4">
                    <h3 className="text-lg font-semibold">Joueurs</h3>
                    {/* Filtre par statut */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
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
                    <span className="text-sm text-gray-500">
                        {filteredPlayers.length} joueur{filteredPlayers.length > 1 ? "s" : ""}
                    </span>
                </div>

                {/* Centre : Recherche */}
                <div className="relative flex-1 max-w-sm">
                    <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Rechercher par nom, email ou téléphone..."
                        className="pl-9 rounded-full h-10"
                    />
                </div>

                {/* Droite : Ajout */}
                <div className="flex flex-row items-center gap-4">
                    <EditPlayers mode="create" onSave={addPlayer} />
                </div>

            </div>

            {/* Tableau */}
            <div className="flex-1 min-h-0">
                <DataTable columns={columns} data={filteredPlayers as PlayerType[]} globalFilter={searchFilter} onGlobalFilterChange={setSearchFilter} />
            </div>
        </div>
    )
}

import Loading from "@/components/shared/Loading";
import { EditPlayers } from "@/components/admin/players/EditPlayers";
import { columns as playerColumns } from "@/components/admin/players/Columns";
import { DataTable } from "@/components/admin/players/Datatable";
import { EventSelector } from "@/components/admin/EventSelector";
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

export function ListPlayers() {

    const { players, addPlayer, updatePlayer, loading } = usePlayers();
    const columns = playerColumns(updatePlayer)

    if (loading) {
        return <Loading />
    }

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-4">
                <div className="flex flex-row items-center gap-4">
                    <h2>Liste des joueurs</h2>
                    <EventSelector />
                </div>
                <div className="flex flex-row items-center gap-4">
                    <EditPlayers 
                        mode="create"
                        onSave={addPlayer}
                    />
                    <Select name="filterPlayer">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtre" />
                        </SelectTrigger> 
                        <SelectContent className="bg-white">
                            <SelectGroup>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="inactive">Inactif</SelectItem>
                                <SelectItem value="member">Membre</SelectItem>
                                <SelectItem value="nonmember">Non Membre</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DataTable columns={columns} data={players as PlayerType[]} />
        </>
    )
}
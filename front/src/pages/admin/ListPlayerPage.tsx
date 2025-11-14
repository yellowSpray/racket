import Loading from "@/components/shared/Loading";
import { columns as playerColumns } from "@/components/admin/players/Columns";
import { DataTable } from "@/components/admin/players/Datatable";
import { usePlayers } from "@/contexts/usePlayers";
import type { PlayerType } from "@/types/player";

export function ListPlayers() {

    const { players, updatePlayer, loading } = usePlayers();
    const columns = playerColumns(updatePlayer)

    if (loading) {
        return <Loading />
    }

    return (
        <DataTable columns={columns} data={players as PlayerType[]} />
    )
}
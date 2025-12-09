import { Badge } from "@/components/ui/badge";
import { EditPlayers } from "@/components/admin/players/EditPlayers";
import type { ColumnDef } from "@tanstack/react-table";
import type { PlayerType } from "@/types/player";

export const columns = (updatePlayer: (id: string, data: Partial<PlayerType>) => Promise<void>): ColumnDef<PlayerType>[] => [
    {
        accessorKey: "box",
        header: "Boxes",
        meta: { className: "text-center" }
    },
    {
        accessorKey: "full_name",
        header: "Prénom Nom",
        accessorFn: (row) => `${row.first_name} ${row.last_name}`
    },
    {
        accessorKey: "phone",
        header: "Téléphone"
    },
    {
        accessorKey: "email",
        header: "Email"
    },
    {
        accessorKey: "arrival",
        header: "Arrivée",
        meta: { className: "text-center" }
    },
    {
        accessorKey: "departure",
        header: "Départ",
        meta: { className: "text-center" }
    },
    {
        accessorKey: "unavailable",
        header: "Absence",
        cell: ({ row }) => (
            <div className="flex gap-1">
                {row.original.unavailable.map((date, i) => (
                    <Badge key={i}>{date}</Badge>
                ))}
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <div className="flex gap-1">
                {row.original.status.map((s, i) => (
                    <Badge key={i} variant={s}>
                        {s}
                    </Badge>
                ))}
            </div>
        ),
    },
    {
        accessorKey: "power_ranking",
        header: "Force",
        meta: { className: "text-center" }
    },
    {
        id: "actions",
        header: "Modif.",
        meta: { className: "text-center" },
        cell: ({row}) => (
            <EditPlayers 
                mode="edit"
                playerData={row.original}
                onSave={(data) => updatePlayer(row.original.id, data)}
            />
        )
    }
]
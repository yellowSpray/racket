import { Badge } from "@/components/ui/Badge";
import type { ColumnDef } from "@tanstack/react-table";
import { EditPlayers } from "@/components/admin/players/EditPlayers";

export type PlayerType = {
    id: string
    box: string
    full_name: string
    phone: string
    email: string
    arrival: string
    departure: string
    unavailable: string[]
    status: ("active" | "inactive" | "member" | "visitor" | "paid" | "unpaid" )[]
    power_ranking: string
}

export const columns: ColumnDef<PlayerType>[] = [
    {
        accessorKey: "box",
        header: "Boxes",
        meta: { className: "text-center" }
    },
    {
        accessorKey: "full_name",
        header: "Prénom Nom"
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
        cell: () => (
            <EditPlayers />
        )
    }
]
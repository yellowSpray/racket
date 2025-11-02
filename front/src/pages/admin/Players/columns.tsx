import { Badge } from "@/components/ui/Badge";
import type { ColumnDef } from "@tanstack/react-table";
import { EditPlayers } from "./EditPlayers";

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
        header: "Box",
        meta: { className: "text-center" }
    },
    {
        accessorKey: "full_name",
        header: "Full Name"
    },
    {
        accessorKey: "phone",
        header: "Phone"
    },
    {
        accessorKey: "email",
        header: "Email"
    },
    {
        accessorKey: "arrival",
        header: "Arrival",
        meta: { className: "text-center" }
    },
    {
        accessorKey: "departure",
        header: "Departure",
        meta: { className: "text-center" }
    },
    {
        accessorKey: "unavailable",
        header: "Unavailable",
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
        header: "Ranking",
        meta: { className: "text-center" }
    },
    {
        id: "actions",
        header: "Edit",
        meta: { className: "text-center" },
        cell: () => (
            <EditPlayers />
        )
    }
]
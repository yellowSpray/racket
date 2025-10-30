import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ColumnDef } from "@tanstack/react-table";

export type PlayerType = {
    id: string
    full_name: string
    phone: string
    email: string
    arrival: string
    departure: string
    unavailable: string[]
    status: ("active" | "inactive" | "member" | "visitor" | "paid" | "unpaid" )[]
}

export const columns: ColumnDef<PlayerType>[] = [
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
        header: "Arrival"
    },
    {
        accessorKey: "departure",
        header: "Departure"
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
        id: "actions",
        header: "Edit",
        cell: () => <Button>Edit</Button>
    }
]
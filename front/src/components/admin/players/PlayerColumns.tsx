import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import type { PlayerType } from "@/types/player";

export const columns = (): ColumnDef<PlayerType>[] => [
    {
        id: "select",
        enableSorting: false,
        enableGlobalFilter: false,
        meta: { className: "w-10 pl-4" },
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
                }
                onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                aria-label="Tout sélectionner"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(v) => row.toggleSelected(!!v)}
                aria-label="Sélectionner"
            />
        ),
    },
    {
        accessorKey: "full_name",
        header: "Prénom Nom",
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
        meta: { className: "pl-8" },
        minSize: 150,
    },
    {
        accessorKey: "phone",
        header: "Téléphone",
        minSize: 110,
    },
    {
        accessorKey: "email",
        header: "Email",
        minSize: 130,
    },
    {
        accessorKey: "arrival",
        header: "Arrivée",
        enableGlobalFilter: false,
        meta: { className: "text-center" },
        minSize: 60,
    },
    {
        accessorKey: "departure",
        header: "Départ",
        enableGlobalFilter: false,
        meta: { className: "text-center" },
        minSize: 60,
    },
    {
        accessorKey: "unavailable",
        header: "Absence",
        enableGlobalFilter: false,
        meta: { className: "text-center" },
        minSize: 100,
        cell: ({ row }) => (
            <div className="flex gap-1 justify-center">
                {row.original.unavailable.map((date, i) => (
                    <Badge key={i}>
                        {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </Badge>
                ))}
            </div>
        ),
    },
    {
        id: "status",
        header: "Status",
        enableGlobalFilter: false,
        meta: { className: "text-center" },
        minSize: 100,
        cell: ({ row }) => {
            const membership = row.original.status.find(s => s === "member" || s === "visitor")
            const activity = row.original.status.find(s => s === "active" || s === "inactive")
            return (
                <div className="grid grid-cols-2 justify-items-center">
                    {membership ? <Badge variant={membership} className="col-span-1">{membership}</Badge> : null}
                    {activity ? <Badge variant={activity} className="col-span-1">{activity}</Badge> : null}
                </div>
            )
        },
    },
    {
        id: "payment",
        header: "Paiement",
        enableGlobalFilter: false,
        meta: { className: "text-center" },
        minSize: 120,
        cell: ({ row }) => {
            const { payments } = row.original
            if (!payments || payments.length === 0) return <span className="text-gray-400">-</span>
            const hidden = payments.slice(0, -2)
            const visible = payments.slice(-2)
            return (
                <div className="flex flex-wrap gap-1 justify-center items-center">
                    {hidden.length > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span><Badge className="cursor-pointer">+{hidden.length}</Badge></span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-gray-300 border-gray-400">
                                <div className="flex gap-1">
                                    {hidden.map((p, i) => (
                                        <Badge key={i} variant={p.status} className="z-100">{p.event_name}</Badge>
                                    ))}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {visible.map((p, i) => (
                        <Badge key={i} variant={p.status}>{p.event_name}</Badge>
                    ))}
                </div>
            )
        },
    },
    {
        accessorKey: "power_ranking",
        header: "Force",
        enableGlobalFilter: false,
        meta: { className: "text-center" },
        minSize: 50,
    },
]

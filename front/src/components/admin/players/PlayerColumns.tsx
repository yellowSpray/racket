import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import type { PlayerType } from "@/types/player";
import { paymentSeriesLabel, paymentFullLabel } from "@/lib/paymentLabels"

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
        /*
         * 145 et non 100 : les deux pastilles restent cote a cote, jamais
         * l'une sous l'autre, donc la colonne doit tenir la paire la plus
         * large. Mesure des quatre libelles possibles : member 62, inactive
         * 59, l'ecart de 4 et les 16 px de retrait de la cellule, soit 141.
         * Quatre pixels de marge au-dessus.
         */
        minSize: 145,
        cell: ({ row }) => {
            const membership = row.original.status.find(s => s === "member" || s === "visitor")
            const activity = row.original.status.find(s => s === "active" || s === "inactive")
            /*
             * Cote a cote, sur une seule ligne, et sans jamais se chevaucher.
             *
             * La grille de deux colonnes d'avant donnait a chaque pastille une
             * case de la moitie de la colonne : une pastille plus large que sa
             * case debordait sur sa voisine. En flex elles gardent leur
             * largeur et se poussent, et c'est le plancher de la colonne,
             * ci-dessus, qui garantit qu'elles tiennent toutes les deux.
             */
            return (
                <div className="flex items-center justify-center gap-1">
                    {membership ? <Badge variant={membership}>{membership}</Badge> : null}
                    {activity ? <Badge variant={activity}>{activity}</Badge> : null}
                </div>
            )
        },
    },
    {
        id: "payment",
        header: "Paiement",
        enableGlobalFilter: false,
        meta: { className: "text-center" },
        /*
         * 170 et non 120 : les pastilles restent sur une ligne, comme celles
         * du statut. Mesure du cas le plus large, deux series visibles plus la
         * pastille de repli : 30 + 56 + 56, les deux ecarts de 4, et les 16 px
         * de retrait de la cellule, soit 166.
         */
        minSize: 170,
        cell: ({ row }) => {
            const { payments } = row.original
            if (!payments || payments.length === 0) return <span className="text-gray-400">-</span>
            const hidden = payments.slice(0, -2)
            const visible = payments.slice(-2)
            return (
                /*
                 * Sur une ligne, comme le statut : les series se lisent en
                 * face les unes des autres d'une rangee a l'autre, ce qu'une
                 * pastille qui passe a la ligne casse aussitot.
                 */
                <div className="flex items-center justify-center gap-1">
                    {hidden.length > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span><Badge className="cursor-pointer">+{hidden.length}</Badge></span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-gray-300 border-gray-400">
                                <div className="flex gap-1">
                                    {hidden.map((p, i) => (
                                        <Badge key={i} variant={p.status} title={paymentFullLabel(p)} className="z-100">{paymentSeriesLabel(p)}</Badge>
                                    ))}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {visible.map((p, i) => (
                        <Badge key={i} variant={p.status} title={paymentFullLabel(p)}>{paymentSeriesLabel(p)}</Badge>
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

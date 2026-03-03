import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditPlayers } from "@/components/admin/players/EditPlayers";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Ellipsis, Pencil, UserMinus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { PlayerType } from "@/types/player";

function PlayerActions({ player, updatePlayer, removePlayer, canRemove }: {
    player: PlayerType
    updatePlayer: (id: string, data: Partial<PlayerType>) => Promise<void>
    removePlayer: (id: string) => Promise<void>
    canRemove: boolean
}) {
    const [editOpen, setEditOpen] = useState(false)
    const [removeOpen, setRemoveOpen] = useState(false)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Ellipsis />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                        <Pencil /> Modifier
                    </DropdownMenuItem>
                    {canRemove && (
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRemoveOpen(true)}
                        >
                            <UserMinus /> Retirer
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <EditPlayers
                mode="edit"
                playerData={player}
                onSave={(data) => updatePlayer(player.id, data)}
                open={editOpen}
                onOpenChange={setEditOpen}
            />

            <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Retirer le joueur</AlertDialogTitle>
                        <AlertDialogDescription>
                            Voulez-vous vraiment retirer {player.first_name} {player.last_name} de cet événement ? Le compte du joueur ne sera pas supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removePlayer(player.id)}>
                            Retirer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export const columns = (
    updatePlayer: (id: string, data: Partial<PlayerType>) => Promise<void>,
    removePlayer: (id: string) => Promise<void>,
    canRemove: boolean = false
): ColumnDef<PlayerType>[] => [
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
        header: "Actions",
        enableSorting: false,
        meta: { className: "text-center" },
        cell: ({row}) => (
            <PlayerActions
                player={row.original}
                updatePlayer={updatePlayer}
                removePlayer={removePlayer}
                canRemove={canRemove}
            />
        )
    }
]

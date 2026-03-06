import { useState } from "react";
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
import type { PlayerType } from "@/types/player";

export function PlayerActions({ player, updatePlayer, removePlayer, canRemove }: {
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

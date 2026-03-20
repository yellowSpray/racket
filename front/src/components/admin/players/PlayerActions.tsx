import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditPlayers } from "@/components/admin/players/EditPlayers";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon, PencilEdit01Icon } from "hugeicons-react";
import type { PlayerType, PaymentStatus } from "@/types/player";

export function PlayerActions({ player, updatePlayer, updatePaymentStatus, updateAbsences }: {
    player: PlayerType
    updatePlayer: (id: string, data: Partial<PlayerType>) => Promise<void>
    updatePaymentStatus: (playerId: string, eventId: string, newStatus: PaymentStatus) => Promise<void>
    updateAbsences: (playerId: string, dates: string[]) => Promise<void>
}) {
    const [editOpen, setEditOpen] = useState(false)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="icon" className="border-0" size="icon">
                        <MoreHorizontalIcon />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                        <PencilEdit01Icon /> Modifier
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EditPlayers
                mode="edit"
                playerData={player}
                onSave={(data) => updatePlayer(player.id, data)}
                onPaymentChange={updatePaymentStatus}
                onAbsencesChange={updateAbsences}
                open={editOpen}
                onOpenChange={setEditOpen}
            />
        </>
    )
}

import { PlayersSkeleton } from "@/components/shared/skeletons/PlayersSkeleton";
import { EditPlayers } from "@/components/admin/players/EditPlayers";
import { columns as playerColumns } from "@/components/admin/players/PlayerColumns";
import { DataTable } from "@/components/admin/players/PlayerTable";
import { usePlayers } from "@/contexts/PlayersContext";
import { useEvent } from "@/contexts/EventContext";
import { useHeaderSlot } from "@/contexts/HeaderSlotContext";
import type { PlayerType } from "@/types/player";
import { FiltresJoueurs } from "@/components/admin/players/FiltresJoueurs";
import { repondAuFiltre, type FiltreJoueurs as Filtre } from "@/lib/filtresJoueurs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Delete02Icon } from "hugeicons-react";
import { ACTION_DE_PAGE, ACTION_ROUGE, ACTION_VERTE } from "@/lib/actionPage";
import { useCallback, useEffect, useMemo, useState } from "react";

export function AdminPlayers() {

    const { players, addPlayer, updatePlayer, deletePlayer, updatePaymentStatus, updateAbsences, loading, fetchPlayer } = usePlayers();
    const { currentRound } = useEvent();
    const [statusFilter, setStatusFilter] = useState<Filtre>("all")
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [deleting, setDeleting] = useState(false)
    const [editPlayer, setEditPlayer] = useState<PlayerType | null>(null)

    const columns = playerColumns()

    const handleDeleteSelected = useCallback(async () => {
        setDeleting(true)
        await Promise.all(selectedIds.map((id) => deletePlayer(id)))
        setSelectedIds([])
        setDeleting(false)
    }, [selectedIds, deletePlayer])

    useEffect(() => {
        fetchPlayer()
    }, [fetchPlayer])

    /*
     * Une seule regle pour filtrer et pour compter, `repondAuFiltre` : deux
     * regles jumelles finiraient par diverger, et une pastille qui annonce un
     * nombre different de ce que la liste montre est pire que pas de nombre.
     */
    const filteredPlayers = useMemo(
        () => players.filter(joueur => repondAuFiltre(joueur, statusFilter)),
        [players, statusFilter],
    )

    /*
     * LA LIGNE DE TITRE PORTE TOUT CE QUI AGIT SUR LA LISTE : les filtres,
     * puis les actions poussees a droite. Le bouton d'ajout vivait dans le
     * header, qui porte ce qui vaut pour toute l'application, pas ce qui vaut
     * pour une page. La suppression le suit : deux actions de la meme liste a
     * deux endroits differents auraient ete plus deroutantes qu'un
     * deplacement.
     *
     * LA RECHERCHE DE LA PAGE EST RETIREE. Elle filtrait sur le nom, l'email et
     * le telephone ; c'est desormais le champ du header qui s'en chargera, une
     * fois qu'il aura un index global a interroger. D'ici la, cet ecran n'a
     * plus de recherche du tout, et c'est une dette assumee, pas un oubli.
     */
    const headerPortal = useHeaderSlot(
        <>
            <h3 className="text-lg font-semibold">Joueurs</h3>

            <FiltresJoueurs
                joueurs={players}
                valeur={statusFilter}
                onChange={setStatusFilter}
            />

            {/* Pousse les actions sur le bord droit de la colonne. */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
                {selectedIds.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            {/*
                              * Neutre au repos, rouge au survol : le rouge d'une
                              * suppression n'a pas a crier tant que personne ne
                              * l'a designee. Le nombre reste, lui, meme reduit
                              * au pictogramme : un bouton qui ne dit pas combien
                              * de lignes il emporte est un piege, et c'est la
                              * seule action irreversible de la page.
                              */}
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={deleting}
                                aria-label={`Supprimer ${selectedIds.length} joueur${selectedIds.length > 1 ? "s" : ""}`}
                                title="Supprimer la selection"
                                className={`${ACTION_DE_PAGE} ${ACTION_ROUGE} w-auto gap-1 px-2 has-[>svg]:px-2`}
                            >
                                <Delete02Icon size={16} strokeWidth={2} />
                                <span data-libelle className="sr-only sm:not-sr-only">Supprimer</span>
                                <span className="tabular-nums">({selectedIds.length})</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer {selectedIds.length} joueur{selectedIds.length > 1 ? "s" : ""} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Ces joueurs seront retirés de l'événement courant. Cette action est irréversible.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected}>
                                    Supprimer
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <EditPlayers
                    mode="create"
                    onSave={addPlayer}
                    size="sm"
                    variant="outline"
                    className={`${ACTION_DE_PAGE} ${ACTION_VERTE}`}
                />
            </div>
        </>
    )


    if (loading && players.length === 0) {
        return <PlayersSkeleton />
    }

    return (
        <>
            {headerPortal}
            <div className="flex flex-col h-full min-h-0">
                {/*
                  * Plus de `globalFilter` pose d'ici : la recherche de la page
                  * est retiree, celle du header la remplacera quand elle aura
                  * un index a interroger. `DataTable` garde sa prop, c'est par
                  * elle que la recherche globale pilotera la liste.
                  */}
                <DataTable
                    columns={columns}
                    data={filteredPlayers as PlayerType[]}
                    onSelectionChange={setSelectedIds}
                    onRowClick={(player) => setEditPlayer(player as PlayerType)}
                />
            </div>

            {editPlayer && (
                <EditPlayers
                    mode="edit"
                    playerData={editPlayer}
                    onSave={(data) => updatePlayer(editPlayer.id, data)}
                    onPaymentChange={updatePaymentStatus}
                    onAbsencesChange={(playerId, dates) => updateAbsences(playerId, dates, currentRound?.id ?? null)}
                    open={true}
                    onOpenChange={(open) => { if (!open) setEditPlayer(null) }}
                />
            )}
        </>
    )
}

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"
import { useEvent } from "@/contexts/EventContext";
import { useGroups } from "@/hooks/useGroups";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeftRight, UserPlus } from "lucide-react";
import type { Group } from "@/types/draw";

interface ManageGroupsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: Group[]
  onRefresh: () => void
}

type WorkflowStep = "select_player" | "select_target" | "select_swap";

export function ManageGroupDialog({
  open,
  onOpenChange,
  groups,
  onRefresh 
}: ManageGroupsDialogProps) {

  const { currentEvent } = useEvent();
  const { loading } = useGroups();

  const [step, setStep] = useState<WorkflowStep>("select_player");
  const [selectedPlayer, setSelectedPlayer] = useState<{id: string, name: string, fromGroup?: string} | null>(null);
  const [targetGroup, setTargetGroup] = useState<{id: string, name: string} | null>(null);
    
  // Reset au fermeture
  useEffect(() => {
    if (!open) {
      setStep("select_player");
      setSelectedPlayer(null);
      setTargetGroup(null);
    }
  }, [open]);

  // Étape 1 : Sélectionner un joueur
  const handleSelectPlayer = (playerId: string,playerName: string,fromGroupId?: string) => {
    setSelectedPlayer({ id: playerId, name: playerName, fromGroup: fromGroupId })
    setStep("select_target")
  };

  // Étape 2 : Sélectionner le groupe cible
  const handleSelectTargetGroup = (groupId: string, groupName: string, currentPlayers: number, maxPlayers: number) => {
    
    setTargetGroup({ id: groupId, name: groupName });

    const willBeFull = currentPlayers >= maxPlayers

    if (willBeFull) {
      // Groupe complet → passer à l'échange
      setStep("select_swap");
    } else {
      // Groupe avec places → déplacer directement
      handleMove(groupId);
    }
  };

  // Étape 3 : Sélectionner le joueur à échanger
  const handleSwap = async (swapPlayerId: string) => {

    if (!currentEvent || !selectedPlayer || !targetGroup) return;

    try {
      const fromGroupId = selectedPlayer.fromGroup;

      // 1. Retirer joueur sélectionné de son groupe
      if (fromGroupId) {
        await supabase
          .from("group_players")
          .delete()
          .eq("group_id", fromGroupId)
          .eq("profile_id", selectedPlayer.id)
      }

      // 2. Retirer joueur swap du groupe cible
      await supabase
        .from("group_players")
        .delete()
        .eq("group_id", targetGroup.id)
        .eq("profile_id", swapPlayerId)

      // 3. Ajouter joueur sélectionné au groupe cible
      await supabase
        .from("group_players")
        .insert({
          group_id: targetGroup.id,
          profile_id: selectedPlayer.id
        })

      // 4. Ajouter joueur swap au groupe d'origine (si existe)
      if (fromGroupId) {
        await supabase
          .from("group_players")
          .insert({
            group_id: fromGroupId,
            profile_id: swapPlayerId
          })
      }

      onRefresh()

      // Reset
      setStep("select_player");
      setSelectedPlayer(null);
      setTargetGroup(null);
    } catch {
      // Swap error handled silently
    }
  };

  // Déplacement simple (groupe non complet)
  const handleMove = async (toGroupId: string) => {
    if (!currentEvent || !selectedPlayer) return;

    try {
      // 1. Retirer du groupe actuel (sans refresh)
      if (selectedPlayer.fromGroup) {
        await supabase
          .from("group_players")
          .delete()
          .eq("group_id", selectedPlayer.fromGroup)
          .eq("profile_id", selectedPlayer.id)
      }

      // 2. Ajouter au nouveau groupe (sans refresh)
      await supabase
        .from("group_players")
        .insert({
          group_id: toGroupId,
          profile_id: selectedPlayer.id
        })

      // ✅ Refresh les groupes
      onRefresh()

      // Reset
      setStep("select_player");
      setSelectedPlayer(null);
      setTargetGroup(null);
    } catch {
      // Move error handled silently
    }
  };

  // Annuler
  const handleCancel = () => {
    setStep("select_player");
    setSelectedPlayer(null);
    setTargetGroup(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Gérer les groupes</DialogTitle>
          <DialogDescription>
            {step === "select_player" && "Sélectionnez un joueur à déplacer"}
            {step === "select_target" && `Déplacer ${selectedPlayer?.name} vers...`}
            {step === "select_swap" && `Échanger ${selectedPlayer?.name} avec...`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message d'instruction */}
          {step === "select_target" && (
            <Alert>
              <UserPlus className="h-4 w-4" />
              <AlertDescription>
                Cliquez sur un groupe pour y déplacer <strong>{selectedPlayer?.name}</strong>
              </AlertDescription>
            </Alert>
          )}

          {step === "select_swap" && targetGroup && (
            <Alert className="bg-blue-50 border-blue-200">
              <ArrowLeftRight className="h-4 w-4" />
              <AlertDescription>
                <strong>{targetGroup.name}</strong> est complet. Choisissez un joueur à échanger avec <strong>{selectedPlayer?.name}</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            {groups.map((group) => {
              const currentPlayers = group.players?.length || 0
              const isFull = currentPlayers >= group.max_players
              const isCurrentGroup = selectedPlayer?.fromGroup === group.id
              const isTargetGroup = targetGroup?.id === group.id
              const canInteract = step === "select_target" && !isCurrentGroup

              return (
                <Card
                  key={group.id}
                  className={`p-4 transition-all ${
                    canInteract
                      ? "cursor-pointer hover:shadow-lg hover:border-blue-400"
                      : ""
                  } ${isTargetGroup ? "border-blue-500 border-2" : ""} ${
                    isCurrentGroup ? "opacity-50" : ""
                  }`}
                  onClick={() => {
                    if (canInteract) {
                      handleSelectTargetGroup(group.id, group.group_name, currentPlayers, group.max_players)
                    }
                  }}
                >
                  {/* Header du groupe */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg">{group.group_name}</h3>
                    <span className={`text-sm px-2 py-1 rounded ${
                      isFull ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {currentPlayers}/{group.max_players}
                    </span>
                  </div>

                  {/* Indicateur d'action */}
                  {canInteract && (
                    <div
                      className={`text-xs font-medium mb-2 flex items-center gap-1 ${
                        isFull ? "text-orange-600" : "text-green-600"
                      }`}
                    >
                      {isFull ? (
                        <>
                          <ArrowLeftRight className="h-3 w-3" />
                          Échanger avec...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" />
                          Déplacer ici
                        </>
                      )}
                    </div>
                  )}

                  {/* Liste des joueurs */}
                  <ul className="space-y-1.5">
                    {group.players?.map((player) => {
                      const canSelect = step === "select_player" || 
                                       (step === "select_swap" && isTargetGroup)
                      const isSelected = selectedPlayer?.id === player.id

                      return (
                        <li
                          key={player.id}
                          className={`text-sm p-2 rounded transition-all ${
                            canSelect ? "cursor-pointer hover:bg-blue-50" : ""
                          } ${isSelected ? "bg-blue-100 font-medium" : ""} ${
                            step === "select_swap" && isTargetGroup
                              ? "hover:bg-orange-50 border border-orange-200"
                              : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (step === "select_player") {
                              handleSelectPlayer(
                                player.id,
                                `${player.first_name} ${player.last_name}`,
                                group.id
                              );
                            } else if (
                              step === "select_swap" &&
                              isTargetGroup
                            ) {
                              handleSwap(player.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {player.first_name} {player.last_name}
                            </span>
                            {step === "select_swap" && isTargetGroup && (
                              <ArrowLeftRight className="h-3 w-3 text-orange-600" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {player.power_ranking}
                          </span>
                        </li>
                      );
                    })}
                    {(!group.players || group.players.length === 0) && (
                      <li className="text-gray-400 italic text-sm">
                        Aucun joueur
                      </li>
                    )}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {step !== "select_player" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Annuler
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

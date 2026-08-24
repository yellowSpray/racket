import type { Group, GroupPlayer } from "@/types/draw"
import type { PromotionResult } from "@/types/ranking"

/**
 * Applique les montées et descentes à la série précédente, **sans rien d'autre**.
 *
 * Aucun joueur n'est retiré, aucun tableau n'est ajouté ni supprimé : on voit
 * uniquement ce que les règles du club produisent à partir des classements.
 * Les joueurs qui ne se réinscriront pas sont donc présents, à la place que les
 * règles leur donnent — c'est précisément ce qu'on veut pouvoir vérifier avant
 * de les retirer.
 *
 * Le retrait des partants et le recalcul du nombre de tableaux sont l'étape
 * suivante, assurée par `buildProposedGroups`.
 */
export function applyPromotionMoves(
    previousGroups: Group[],
    promotionResult: PromotionResult,
): Group[] {
    if (previousGroups.length === 0) return []

    // Tableau cible de chaque joueur d'après le moteur
    const targetGroupIdOf = new Map<string, string>()
    for (const staying of promotionResult.stayingPlayers) {
        targetGroupIdOf.set(staying.playerId, staying.groupId)
    }
    for (const move of promotionResult.moves) {
        targetGroupIdOf.set(move.playerId, move.toGroupId)
    }

    const indexOfGroupId = new Map(previousGroups.map((group, index) => [group.id, index]))

    const buckets: GroupPlayer[][] = previousGroups.map(() => [])
    const originIndexOf = new Map<string, number>()

    previousGroups.forEach((group, originIndex) => {
        for (const player of group.players ?? []) {
            originIndexOf.set(player.id, originIndex)

            const targetGroupId = targetGroupIdOf.get(player.id)
            const targetIndex = targetGroupId !== undefined
                ? indexOfGroupId.get(targetGroupId) ?? originIndex
                // Joueur inconnu du moteur (classement incomplet) : il ne bouge pas
                : originIndex

            buckets[targetIndex].push(player)
        }
    })

    /** -1 : arrive du tableau du dessus · 0 : reste · 1 : arrive du tableau du dessous */
    const arrivalOrder = (player: GroupPlayer, boxIndex: number) => {
        const from = originIndexOf.get(player.id) ?? boxIndex
        if (from < boxIndex) return -1
        if (from > boxIndex) return 1
        return 0
    }

    return previousGroups.map((group, index) => ({
        ...group,
        players: buckets[index]
            .slice()
            .sort((a, b) => arrivalOrder(a, index) - arrivalOrder(b, index)),
    }))
}

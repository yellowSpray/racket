import type { Group } from "@/types/draw"
import type { GroupStandings, PromotionResult } from "@/types/ranking"

/**
 * De quoi situer un joueur : d'où il vient, où les règles voulaient l'envoyer,
 * et à quel rang il a terminé la série précédente.
 */
export interface PlacementContext {
    /** Index du tableau d'origine (0 = meilleur tableau). */
    previousBoxIndexOf: Map<string, number>
    /** Index du tableau décidé par le moteur de promotion. */
    targetBoxIndexOf: Map<string, number>
    /** Rang dans son tableau d'origine (1 = premier). */
    rankOf: Map<string, number>
}

export function buildPlacementContext(
    previousGroups: Group[],
    previousStandings: GroupStandings[],
    promotionResult: PromotionResult,
): PlacementContext {
    const previousBoxIndexOf = new Map<string, number>()
    previousGroups.forEach((group, index) => {
        for (const player of group.players ?? []) previousBoxIndexOf.set(player.id, index)
    })

    const indexOfGroupId = new Map(previousGroups.map((group, index) => [group.id, index]))

    const targetBoxIndexOf = new Map<string, number>()
    for (const staying of promotionResult.stayingPlayers) {
        const index = indexOfGroupId.get(staying.groupId)
        if (index !== undefined) targetBoxIndexOf.set(staying.playerId, index)
    }
    for (const move of promotionResult.moves) {
        const index = indexOfGroupId.get(move.toGroupId)
        if (index !== undefined) targetBoxIndexOf.set(move.playerId, index)
    }

    const rankOf = new Map<string, number>()
    for (const group of previousStandings) {
        for (const standing of group.standings) rankOf.set(standing.playerId, standing.rank)
    }

    return { previousBoxIndexOf, targetBoxIndexOf, rankOf }
}

/**
 * Rang de la catégorie d'un joueur dans un tableau donné, du haut vers le bas :
 *
 * 0. arrive du tableau du dessus (relégué entrant)
 * 1. est resté alors qu'il devait monter — il a fini en tête de son tableau
 * 2. se maintient
 * 3. est resté alors qu'il devait descendre — faute de tableau en dessous, ou
 *    parce que la redistribution l'a rattrapé. Il passe sous les maintenus,
 *    mais reste au-dessus de ceux qui arrivent d'en bas.
 * 4. arrive du tableau du dessous (promu entrant)
 * 5. inconnu de la série précédente (nouveau joueur)
 */
export function placementCategory(playerId: string, boxIndex: number, context: PlacementContext): number {
    const from = context.previousBoxIndexOf.get(playerId)
    if (from === undefined) return 5

    if (from < boxIndex) return 0
    if (from > boxIndex) return 4

    const target = context.targetBoxIndexOf.get(playerId)
    if (target !== undefined && target < from) return 1
    if (target !== undefined && target > from) return 3
    return 2
}

/**
 * Ordonne deux joueurs à l'intérieur d'un tableau : d'abord la catégorie, puis le
 * tableau d'origine, puis le **classement de la série précédente**.
 *
 * Le classement de force (`power_ranking`) n'intervient pas : il reflète le niveau
 * historique du joueur, pas ce qu'il vient de réaliser. Trier dessus faisait passer
 * un joueur à 0 point devant un joueur à 13 points.
 */
export function comparePlacement(
    aId: string,
    bId: string,
    boxIndex: number,
    context: PlacementContext,
): number {
    const categoryDelta = placementCategory(aId, boxIndex, context) - placementCategory(bId, boxIndex, context)
    if (categoryDelta !== 0) return categoryDelta

    const fromDelta = (context.previousBoxIndexOf.get(aId) ?? Number.MAX_SAFE_INTEGER)
        - (context.previousBoxIndexOf.get(bId) ?? Number.MAX_SAFE_INTEGER)
    if (fromDelta !== 0) return fromDelta

    return (context.rankOf.get(aId) ?? Number.MAX_SAFE_INTEGER)
        - (context.rankOf.get(bId) ?? Number.MAX_SAFE_INTEGER)
}

/**
 * Ordre global utilisé quand le nombre de tableaux change et qu'il faut
 * redistribuer : tableau cible d'abord, puis l'ordre interne ci-dessus.
 *
 * C'est cet ordre qui décide qui reste dans le tableau du haut lorsqu'il n'y a
 * plus assez de places — d'où l'importance qu'il suive le classement.
 */
export function compareForRedistribution(
    aId: string,
    bId: string,
    context: PlacementContext,
): number {
    const aTarget = context.targetBoxIndexOf.get(aId) ?? context.previousBoxIndexOf.get(aId) ?? Number.MAX_SAFE_INTEGER
    const bTarget = context.targetBoxIndexOf.get(bId) ?? context.previousBoxIndexOf.get(bId) ?? Number.MAX_SAFE_INTEGER
    if (aTarget !== bTarget) return aTarget - bTarget

    return comparePlacement(aId, bId, aTarget, context)
}

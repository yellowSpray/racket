import type { Group } from "@/types/draw"
import type { GroupStandings, PromotionResult } from "@/types/ranking"

/**
 * Nature du placement d'un joueur dans un tableau, par rapport à la série précédente.
 *
 * - `promotion` / `relegation` : le joueur a changé de tableau, conformément aux règles du club
 * - `stay`      : le joueur reste dans le même tableau, conformément aux règles
 * - `new`       : le joueur n'était pas dans la série précédente
 * - `adjusted`  : le joueur n'est pas là où les règles le prévoyaient (ajustement manuel
 *                 ou redistribution automatique quand le nombre de tableaux change)
 * - `returning` : le joueur était absent de la série précédente mais connu du club
 */
export type MovementType = "promotion" | "relegation" | "stay" | "new" | "adjusted" | "returning"

export interface PlayerMovement {
    playerId: string
    type: MovementType
    /** Tableau de la série précédente, `null` si le joueur n'y figurait pas. */
    fromGroupName: string | null
    /** Tableau de la série courante. */
    toGroupName: string
    /** Index du tableau précédent (0 = meilleur tableau), `null` si absent. */
    fromTier: number | null
    /** Index du tableau courant (0 = meilleur tableau). */
    toTier: number
    /** Nombre de tableaux gagnés (positif = montée), `null` si pas de référence. */
    tierDelta: number | null
    /** Classement final dans son tableau précédent. */
    rank: number | null
    /** Points marqués dans la série précédente. */
    points: number | null
    /**
     * Tableau que les règles prévoyaient, renseigné uniquement quand il diffère
     * du tableau réel (type `adjusted`).
     */
    expectedGroupName: string | null
}

/** Ordonne les tableaux et renvoie l'index de chacun (0 = meilleur tableau). */
function tierIndexByGroupId(groups: Group[]): Map<string, number> {
    const map = new Map<string, number>()
    groups.forEach((group, index) => map.set(group.id, index))
    return map
}

/** Retrouve, pour chaque joueur, le tableau de la série précédente. */
function previousGroupByPlayer(previousGroups: Group[]): Map<string, Group> {
    const map = new Map<string, Group>()
    for (const group of previousGroups) {
        for (const player of group.players || []) {
            map.set(player.id, group)
        }
    }
    return map
}

/** Classement et points de chaque joueur dans la série précédente. */
function standingByPlayer(previousStandings: GroupStandings[]) {
    const map = new Map<string, { rank: number; points: number }>()
    for (const group of previousStandings) {
        for (const standing of group.standings) {
            map.set(standing.playerId, { rank: standing.rank, points: standing.points })
        }
    }
    return map
}

export interface ComputePlayerMovementsInput {
    /** Tableaux de la série courante, du meilleur au moins bon. */
    currentGroups: Group[]
    /** Tableaux de la série précédente, du meilleur au moins bon. */
    previousGroups: Group[]
    /** Classements calculés sur la série précédente. */
    previousStandings: GroupStandings[]
    /** Ce que le moteur de promotion/relégation prévoyait. */
    promotionResult: PromotionResult
    /** Joueurs connus du club, pour distinguer un retour d'une première participation. */
    knownPlayerIds?: Set<string>
}

/**
 * Explique le placement de chaque joueur de la série courante.
 *
 * Le mouvement (d'où vient le joueur, où il est) est **factuel** : il se lit dans les
 * données. La raison, elle, est **reconstituée** : on rejoue le moteur de promotion sur
 * la série précédente et on compare à ce qui a réellement été enregistré. Quand les deux
 * divergent, on ne devine pas pourquoi — on le signale (`adjusted`) en indiquant le
 * tableau attendu, ce qui couvre aussi bien un déplacement manuel de l'admin qu'une
 * redistribution automatique due à un changement du nombre de tableaux.
 */
export function computePlayerMovements({
    currentGroups,
    previousGroups,
    previousStandings,
    promotionResult,
    knownPlayerIds,
}: ComputePlayerMovementsInput): Map<string, PlayerMovement> {
    const result = new Map<string, PlayerMovement>()

    const previousTierByGroupId = tierIndexByGroupId(previousGroups)
    const previousGroupOf = previousGroupByPlayer(previousGroups)
    const standingOf = standingByPlayer(previousStandings)

    // Ce que les règles prévoyaient : id du tableau cible par joueur
    const expectedGroupIdOf = new Map<string, string>()
    const engineMoveTypeOf = new Map<string, "promotion" | "relegation">()
    for (const staying of promotionResult.stayingPlayers) {
        expectedGroupIdOf.set(staying.playerId, staying.groupId)
    }
    for (const move of promotionResult.moves) {
        expectedGroupIdOf.set(move.playerId, move.toGroupId)
        engineMoveTypeOf.set(move.playerId, move.type)
    }

    const previousGroupNameById = new Map(previousGroups.map(g => [g.id, g.group_name]))

    currentGroups.forEach((group, toTier) => {
        for (const player of group.players || []) {
            const from = previousGroupOf.get(player.id)
            const standing = standingOf.get(player.id) ?? null

            // Joueur absent de la série précédente
            if (!from) {
                result.set(player.id, {
                    playerId: player.id,
                    type: knownPlayerIds?.has(player.id) ? "returning" : "new",
                    fromGroupName: null,
                    toGroupName: group.group_name,
                    fromTier: null,
                    toTier,
                    tierDelta: null,
                    rank: null,
                    points: null,
                    expectedGroupName: null,
                })
                continue
            }

            const fromTier = previousTierByGroupId.get(from.id) ?? null
            // Un tier plus petit est un meilleur tableau : monter, c'est voir toTier diminuer
            const tierDelta = fromTier === null ? null : fromTier - toTier

            const expectedGroupId = expectedGroupIdOf.get(player.id)
            const expectedTier = expectedGroupId !== undefined
                ? previousTierByGroupId.get(expectedGroupId) ?? null
                : null

            // Le placement réel colle-t-il à ce que les règles prévoyaient ?
            const followsRules = expectedTier !== null && expectedTier === toTier

            let type: MovementType
            if (!followsRules) {
                type = "adjusted"
            } else {
                type = engineMoveTypeOf.get(player.id) ?? "stay"
            }

            result.set(player.id, {
                playerId: player.id,
                type,
                fromGroupName: from.group_name,
                toGroupName: group.group_name,
                fromTier,
                toTier,
                tierDelta,
                rank: standing?.rank ?? null,
                points: standing?.points ?? null,
                expectedGroupName: followsRules || expectedGroupId === undefined
                    ? null
                    : previousGroupNameById.get(expectedGroupId) ?? null,
            })
        }
    })

    return result
}

/** Libellé court, pour un badge. */
export function movementLabel(movement: PlayerMovement): string {
    switch (movement.type) {
        case "promotion": return "Monte"
        case "relegation": return "Descend"
        case "stay": return "Maintenu"
        case "new": return "Nouveau"
        case "returning": return "De retour"
        case "adjusted": return "Ajusté"
    }
}

/**
 * Phrase complète expliquant le placement, destinée à l'infobulle.
 * Exemple : « 1er du Box 3 avec 24 pts → promu au Box 2 ».
 */
export function describeMovement(movement: PlayerMovement): string {
    const { fromGroupName, toGroupName, rank, points, expectedGroupName } = movement

    const origin = fromGroupName
        ? `${rank !== null ? `${rank}${rank === 1 ? "er" : "e"} du ` : ""}${fromGroupName}${points !== null ? ` avec ${points} pts` : ""}`
        : null

    switch (movement.type) {
        case "promotion":
            return `${origin} → promu au ${toGroupName}`
        case "relegation":
            return `${origin} → relégué au ${toGroupName}`
        case "stay":
            return `${origin} → se maintient au ${toGroupName}`
        // Formulé sur ce qu'on sait réellement : le joueur n'était pas dans la série
        // précédente. Sans historique complet, on ne peut pas affirmer qu'il débute.
        case "new":
            return `Absent de la série précédente → placé au ${toGroupName} selon son classement`
        case "returning":
            return `De retour après une absence → placé au ${toGroupName} selon son classement`
        case "adjusted":
            return expectedGroupName
                ? `${origin} → attendu au ${expectedGroupName}, placé au ${toGroupName} (ajustement manuel ou redistribution)`
                : `${origin} → placé au ${toGroupName} (ajustement manuel ou redistribution)`
    }
}

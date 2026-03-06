export const DEFAULT_K_FACTOR = 32

export interface EloMatchResult {
    matchId: string
    winnerId: string
    loserId: string
    score: string
}

export interface EloDeltas {
    winnerDelta: number
    loserDelta: number
}

/**
 * Probabilité que le joueur A batte le joueur B.
 * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function calculateExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Multiplicateur de marge appliqué au K-factor selon le score.
 * 3-0 → 1.25, 3-1 → 1.10, 3-2 → 1.00, ABS → 0.50
 */
export function getMarginMultiplier(score: string | null): number {
    if (!score) return 1.00

    if (score.includes("ABS")) return 0

    // Normaliser : extraire les deux chiffres et prendre max-min
    const match = score.match(/^(\d+)-(\d+)$/)
    if (!match) return 1.00

    const a = parseInt(match[1], 10)
    const b = parseInt(match[2], 10)
    const winnerSets = Math.max(a, b)
    const loserSets = Math.min(a, b)
    const normalized = `${winnerSets}-${loserSets}`

    const multipliers: Record<string, number> = {
        "3-0": 1.25,
        "3-1": 1.10,
        "3-2": 1.00,
    }

    return multipliers[normalized] ?? 1.00
}

/**
 * Calcule le changement Elo pour un match.
 * Retourne des deltas entiers symétriques (winnerDelta = -loserDelta).
 */
export function calculateEloChange(
    ratingWinner: number,
    ratingLoser: number,
    score: string | null,
    kFactor: number = DEFAULT_K_FACTOR
): EloDeltas {
    const multiplier = getMarginMultiplier(score)
    if (multiplier === 0) return { winnerDelta: 0, loserDelta: 0 }

    const expected = calculateExpectedScore(ratingWinner, ratingLoser)
    const delta = Math.round(kFactor * multiplier * (1 - expected))

    return {
        winnerDelta: delta,
        loserDelta: -delta,
    }
}

/**
 * Calcule les nouveaux ratings pour tous les résultats d'un événement.
 * Tous les deltas sont calculés à partir des ratings initiaux (début d'événement),
 * puis sommés — l'ordre des matchs n'influence pas le résultat.
 * Retourne uniquement les joueurs dont le rating a changé.
 */
export function computeEloUpdates(
    results: EloMatchResult[],
    currentRatings: Map<string, number>
): Map<string, number> {
    if (results.length === 0) return new Map()

    const deltas = new Map<string, number>()

    for (const result of results) {
        const winnerRating = currentRatings.get(result.winnerId)
        const loserRating = currentRatings.get(result.loserId)

        if (winnerRating === undefined || loserRating === undefined) continue

        const { winnerDelta, loserDelta } = calculateEloChange(
            winnerRating, loserRating, result.score
        )

        deltas.set(result.winnerId, (deltas.get(result.winnerId) ?? 0) + winnerDelta)
        deltas.set(result.loserId, (deltas.get(result.loserId) ?? 0) + loserDelta)
    }

    const updatedRatings = new Map<string, number>()
    for (const [id, delta] of deltas) {
        if (delta !== 0) {
            updatedRatings.set(id, currentRatings.get(id)! + delta)
        }
    }

    return updatedRatings
}

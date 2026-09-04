import type { Match } from "@/types/match"

/**
 * Normalise un score saisi du point de vue d'un joueur vers le format stocké en base,
 * toujours écrit `player1-player2`.
 *
 * Ex. : saisi « 3-1 » par le joueur 2 → stocké « 1-3 ».
 */
export function normalizeScoreForDb(score: string, isPlayer1: boolean): string {
    if (score === "ABS") return isPlayer1 ? "ABS-0" : "0-ABS"
    if (isPlayer1) return score

    const parts = score.split("-")
    if (parts.length !== 2) return score
    return `${parts[1]}-${parts[0]}`
}

/** Déduit le vainqueur d'un score déjà normalisé (`player1-player2`). */
export function computeWinnerId(score: string, player1Id: string, player2Id: string): string | null {
    if (score.startsWith("ABS")) return player2Id
    if (score.endsWith("ABS")) return player1Id

    const parts = score.split("-").map(Number)
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
    return parts[0] > parts[1] ? player1Id : player2Id
}

/** Réécrit un score enregistré du point de vue du joueur demandé. */
export function orientScore(match: Pick<Match, "player1_id" | "score">, playerId: string): string {
    const score = match.score
    if (!score) return ""
    if (score === "WO" || score === "ABS") return score

    const parts = score.split("-")
    if (parts.length !== 2) return score
    return match.player1_id === playerId ? score : `${parts[1]}-${parts[0]}`
}

export interface HeadToHeadSummary {
    played: number
    wins: number
    losses: number
}

/**
 * Bilan des confrontations entre deux joueurs, du point de vue de `playerId`.
 * Les matchs sans résultat ne comptent pas — un match programmé n'est pas un match joué.
 */
export function summarizeHeadToHead(matches: Match[], playerId: string): HeadToHeadSummary {
    let wins = 0
    let losses = 0

    for (const match of matches) {
        if (!match.winner_id || !match.score) continue
        if (match.winner_id === playerId) wins += 1
        else losses += 1
    }

    return { played: wins + losses, wins, losses }
}

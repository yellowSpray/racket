import type { Match } from "@/types/match"
import type { ScorePointsEntry, ScoringRules } from "@/types/settings"
import type { GroupStandings, PlayerStanding } from "@/types/ranking"

export type MatchOutcome = "win" | "loss" | "walkover_win" | "walkover_loss" | "absence"

interface ParsedScore {
    winnerId: string | null
    setsPlayer1: number
    setsPlayer2: number
}

/**
 * Parse un score texte et détermine le vainqueur.
 * - Score simple : "3-1" → player1 gagne (3 > 1)
 * - Multi-sets : "15-12 15-8" → compte les sets gagnés par chaque joueur
 * - "ABS-0" → player1 absent, player2 gagne
 * - "0-ABS" → player2 absent, player1 gagne
 * - "WO", "", null → retourne null
 */
export function parseScore(
    score: string | null,
    player1Id: string,
    player2Id: string
): ParsedScore | null {
    if (!score || score === "WO") return null

    // Absence : "ABS-X" ou "X-ABS"
    const absMatch = score.match(/^(ABS|\d+)-(ABS|\d+)$/)
    if (absMatch && (absMatch[1] === "ABS" || absMatch[2] === "ABS")) {
        if (absMatch[1] === "ABS") {
            // Player 1 absent → player 2 wins
            return { winnerId: player2Id, setsPlayer1: 0, setsPlayer2: 0 }
        }
        // Player 2 absent → player 1 wins
        return { winnerId: player1Id, setsPlayer1: 0, setsPlayer2: 0 }
    }

    const parts = score.trim().split(/\s+/)

    if (parts.length === 1) {
        // Score simple : "3-1"
        const match = parts[0].match(/^(\d+)-(\d+)$/)
        if (!match) return null

        const s1 = parseInt(match[1], 10)
        const s2 = parseInt(match[2], 10)
        const winnerId = s1 > s2 ? player1Id : s2 > s1 ? player2Id : null

        return { winnerId, setsPlayer1: s1, setsPlayer2: s2 }
    }

    // Multi-sets : "15-12 15-8" ou "15-12 8-15 15-10"
    let setsWonP1 = 0
    let setsWonP2 = 0

    for (const part of parts) {
        const match = part.match(/^(\d+)-(\d+)$/)
        if (!match) return null

        const s1 = parseInt(match[1], 10)
        const s2 = parseInt(match[2], 10)

        if (s1 > s2) setsWonP1++
        else if (s2 > s1) setsWonP2++
    }

    const winnerId = setsWonP1 > setsWonP2 ? player1Id : setsWonP2 > setsWonP1 ? player2Id : null

    return { winnerId, setsPlayer1: setsWonP1, setsPlayer2: setsWonP2 }
}

/**
 * Détermine l'issue d'un match pour un joueur donné.
 */
export function determineMatchOutcome(
    match: Match,
    playerId: string
): MatchOutcome | null {
    if (match.player1_id !== playerId && match.player2_id !== playerId) return null
    if (!match.winner_id) return null

    const isWalkover = match.score === "WO"
    const isAbsence = !!match.score && match.score.includes("ABS")
    const isWinner = match.winner_id === playerId

    if (isWalkover) {
        return isWinner ? "walkover_win" : "walkover_loss"
    }

    if (isAbsence) {
        // Le joueur absent perd, l'autre gagne par absence
        return isWinner ? "walkover_win" : "absence"
    }

    return isWinner ? "win" : "loss"
}

/**
 * Lookup le barème de points pour un score donné.
 * - WO → lookup "WO"
 * - ABS → lookup "ABS"
 * - Score normal → normaliser en "max-min" (ex: "1-3" → "3-1") → lookup
 * Retourne { winnerPts, loserPts } ou null si pas trouvé.
 */
export function getPointsForScore(
    matchScore: string | null,
    scorePoints: ScorePointsEntry[]
): { winnerPts: number; loserPts: number } | null {
    if (!matchScore) return null

    if (matchScore === "WO" || matchScore.includes("ABS")) {
        const entry = scorePoints.find(e => e.score === "ABS")
        return entry ? { winnerPts: entry.winner_points, loserPts: entry.loser_points } : null
    }

    // Score normal: parse and normalize to "max-min"
    const m = matchScore.trim().match(/^(\d+)-(\d+)$/)
    if (!m) return null

    const a = parseInt(m[1], 10)
    const b = parseInt(m[2], 10)
    const normalized = `${Math.max(a, b)}-${Math.min(a, b)}`

    const entry = scorePoints.find(e => e.score === normalized)
    return entry ? { winnerPts: entry.winner_points, loserPts: entry.loser_points } : null
}

interface PlayerStats {
    playerId: string
    playerName: string
    played: number
    wins: number
    losses: number
    walkoversWon: number
    walkoversLost: number
    points: number
    setsWon: number
    setsLost: number
    headToHead: Map<string, "win" | "loss">
}

/**
 * Calcule le classement d'un groupe à partir des matchs et des règles de scoring.
 */
export function calculateGroupStandings(
    matches: Match[],
    groupId: string,
    groupName: string,
    players: { id: string; first_name: string; last_name: string }[],
    scoringRules: ScoringRules
): GroupStandings {
    // Initialiser les stats de chaque joueur
    const statsMap = new Map<string, PlayerStats>()
    for (const player of players) {
        statsMap.set(player.id, {
            playerId: player.id,
            playerName: `${player.first_name} ${player.last_name}`,
            played: 0,
            wins: 0,
            losses: 0,
            walkoversWon: 0,
            walkoversLost: 0,
            points: 0,
            setsWon: 0,
            setsLost: 0,
            headToHead: new Map(),
        })
    }

    const { score_points } = scoringRules

    // Traiter chaque match
    for (const match of matches) {
        if (!match.winner_id) continue // match non joué

        const stats1 = statsMap.get(match.player1_id)
        const stats2 = statsMap.get(match.player2_id)
        if (!stats1 || !stats2) continue

        const isWalkover = match.score === "WO"
        const isAbsence = !!match.score && match.score.includes("ABS")
        const isP1Winner = match.winner_id === match.player1_id

        stats1.played++
        stats2.played++

        const pts = getPointsForScore(match.score, score_points)
        const winnerPts = pts?.winnerPts ?? 0
        const loserPts = pts?.loserPts ?? 0

        if (isWalkover) {
            if (isP1Winner) {
                stats1.walkoversWon++
                stats2.walkoversLost++
                stats1.points += winnerPts
                stats2.points += loserPts
            } else {
                stats2.walkoversWon++
                stats1.walkoversLost++
                stats2.points += winnerPts
                stats1.points += loserPts
            }
        } else if (isAbsence) {
            if (isP1Winner) {
                stats1.walkoversWon++
                stats1.points += winnerPts
                stats2.points += loserPts
            } else {
                stats2.walkoversWon++
                stats2.points += winnerPts
                stats1.points += loserPts
            }
        } else {
            // Match normal — parser le score pour les sets
            const parsed = parseScore(match.score, match.player1_id, match.player2_id)
            if (parsed) {
                stats1.setsWon += parsed.setsPlayer1
                stats1.setsLost += parsed.setsPlayer2
                stats2.setsWon += parsed.setsPlayer2
                stats2.setsLost += parsed.setsPlayer1
            }

            if (isP1Winner) {
                stats1.wins++
                stats2.losses++
                stats1.points += winnerPts
                stats2.points += loserPts
                stats1.headToHead.set(match.player2_id, "win")
                stats2.headToHead.set(match.player1_id, "loss")
            } else {
                stats2.wins++
                stats1.losses++
                stats2.points += winnerPts
                stats1.points += loserPts
                stats2.headToHead.set(match.player1_id, "win")
                stats1.headToHead.set(match.player2_id, "loss")
            }
        }
    }

    // Trier : points desc → head-to-head → diff sets → alphabétique
    const allStats = Array.from(statsMap.values())
    allStats.sort((a, b) => {
        // 1. Points décroissants
        if (b.points !== a.points) return b.points - a.points

        // 2. Head-to-head
        const aVsB = a.headToHead.get(b.playerId)
        if (aVsB === "win") return -1
        if (aVsB === "loss") return 1

        // 3. Différence de sets
        const aDiff = a.setsWon - a.setsLost
        const bDiff = b.setsWon - b.setsLost
        if (bDiff !== aDiff) return bDiff - aDiff

        // 4. Alphabétique
        return a.playerName.localeCompare(b.playerName)
    })

    // Assigner les rangs
    const standings: PlayerStanding[] = allStats.map((s, index) => ({
        playerId: s.playerId,
        playerName: s.playerName,
        rank: index + 1,
        played: s.played,
        wins: s.wins,
        losses: s.losses,
        walkoversWon: s.walkoversWon,
        walkoversLost: s.walkoversLost,
        points: s.points,
    }))

    return { groupId, groupName, standings }
}

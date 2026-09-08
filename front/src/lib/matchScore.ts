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

/**
 * Delai laisse apres l'heure prevue avant qu'un match sans score soit
 * considere comme non joue.
 *
 * Une heure trente : le temps de jouer, puis de saisir le resultat depuis le
 * club. En dessous, une case passerait au rouge alors que les joueurs sont
 * encore sur le terrain.
 */
export const DELAI_AVANT_NON_JOUE_MINUTES = 90

/**
 * Dit si un match aurait du etre joue et n'a aucun resultat.
 *
 * Ces cases sont les seules du tableau qui demandent une action, et rien ne
 * les distinguait d'un match a venir : elles affichaient une date et une
 * heure, comme les autres. Un joueur devant le tableau publie ne pouvait pas
 * savoir si le match se jouait jeudi prochain ou s'il devait se jouer jeudi
 * dernier et que personne n'avait rien dit.
 *
 * Un forfait n'en fait pas partie : « ABS » est un resultat, pas une absence
 * de resultat, et il rapporte des points.
 *
 * L'heure est lue comme une heure murale. La base rend `19:30:00+00`, mais ce
 * decalage est decoratif dans toute l'application : `formatTimeForInput` le
 * coupe et l'ecran affiche 19:30. La bascule doit suivre la meme lecture, sans
 * quoi elle se produirait a une heure differente de celle qui est affichee.
 *
 * Une date ou une heure illisible rend `false` : mieux vaut montrer un match a
 * venir que d'alarmer a tort.
 */
export function isMatchUnplayed(
    match: Pick<Match, "score" | "match_date" | "match_time">,
    now: Date = new Date(),
): boolean {
    if (match.score) return false
    if (!match.match_date || !match.match_time) return false

    const heure = match.match_time.replace(/([+-]\d{2}(:\d{2})?)$/, "").slice(0, 5)
    const debut = new Date(`${match.match_date}T${heure}`)
    if (Number.isNaN(debut.getTime())) return false

    return now.getTime() >= debut.getTime() + DELAI_AVANT_NON_JOUE_MINUTES * 60_000
}

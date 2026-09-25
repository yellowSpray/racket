import type { Match } from "@/types/match"

/**
 * Les journées de jeu d'une série, et par où l'on y entre.
 *
 * L'écran des matchs n'affiche plus qu'une journée à la fois, dans ses deux
 * vues. Empiler toutes les dates donnait une page de plusieurs écrans où deux
 * tableaux voisins se ressemblent trait pour trait, et sur téléphone la date
 * était même hors champ, centrée sur une table de 924 px.
 *
 * Les dates viennent des matchs et non du calendrier de la série : une série
 * peut être ouverte sur trois semaines sans qu'on joue tous les jours, et une
 * journée sans match n'a rien à montrer.
 */

/** Les dates portant au moins un match, sans doublon, dans l'ordre. */
export function datesDeJeu(matchs: Match[]): string[] {
    return [...new Set(matchs.map(m => m.match_date))].sort()
}

/**
 * La journée sur laquelle l'écran s'ouvre : la prochaine à jouer, sinon la
 * dernière.
 *
 * On ouvre cet écran pour le match de ce soir, pas pour celui d'il y a trois
 * semaines. Le jour même compte comme à venir, il reste des scores à saisir
 * tant qu'il n'est pas fini. Série terminée, c'est la dernière journée qui
 * s'ouvre, celle dont les scores manquent encore.
 */
export function dateParDefaut(dates: string[], aujourdhui: string): string | null {
    if (dates.length === 0) return null
    return dates.find(d => d >= aujourdhui) ?? dates[dates.length - 1]
}

/**
 * La journée précédente ou suivante, `null` au bout.
 *
 * Ce `null` désactive la flèche. Une flèche qui boucle sur la première date
 * ferait croire qu'il reste une journée là où il n'y en a plus.
 */
export function dateVoisine(dates: string[], courante: string, pas: -1 | 1): string | null {
    const i = dates.indexOf(courante)
    if (i === -1) return null
    return dates[i + pas] ?? null
}

/**
 * La date du jour telle que l'utilisateur la lit, `2026-09-24`.
 *
 * `toISOString` rendrait la date UTC : a Bruxelles, un samedi a 00h30 est
 * encore vendredi en UTC, et l'ecran se serait ouvert sur la veille. Le
 * format suedois est le seul que `toLocaleDateString` rend en ISO.
 */
export function aujourdhuiLocal(maintenant: Date = new Date()): string {
    return maintenant.toLocaleDateString("sv-SE")
}

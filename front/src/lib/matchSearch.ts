import type { Match } from "@/types/match"

/**
 * Forme comparable d'une chaîne : minuscules, sans accents, sans espaces
 * autour. Un admin tape « lefevre » pour trouver « Lefèvre ».
 */
export function normalizeSearch(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
}

/**
 * Le match concerne-t-il le joueur cherché ?
 *
 * Une recherche vide accepte tout : les deux vues des matchs s'en servent pour
 * décider quoi masquer (vue par jour) ou quoi estomper (vue par terrain), et
 * l'absence de recherche ne doit rien changer à l'affichage.
 */
export function matchesPlayerSearch(match: Match, query: string): boolean {
    const needle = normalizeSearch(query)
    if (!needle) return true

    const name = (p: { first_name: string; last_name: string } | undefined) =>
        p ? normalizeSearch(`${p.first_name} ${p.last_name}`) : ""

    return name(match.player1).includes(needle) || name(match.player2).includes(needle)
}

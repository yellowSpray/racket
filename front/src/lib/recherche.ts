import type { Group } from "@/types/draw"
import { normalizeSearch } from "@/lib/matchSearch"

/*
 * Les regles de la recherche du header, une par sorte de chose cherchee.
 *
 * Toutes acceptent tout quand la recherche est vide : la page filtre sans se
 * demander si quelqu'un cherche, et une recherche vide ne change rien.
 */

/** Un texte contient-il la recherche, accents et casse ignores ? */
export function texteRepond(texte: string, recherche: string): boolean {
    const aiguille = normalizeSearch(recherche)
    if (!aiguille) return true
    return normalizeSearch(texte).includes(aiguille)
}

const chiffres = (valeur: string) => valeur.replace(/\D/g, "")

/**
 * Le joueur correspond-il a la recherche ?
 *
 * Par son nom, dans les deux ordres (« alice lef » comme « lefevre alice »),
 * par son email, et par son telephone sans tenir compte des espaces : un
 * numero se tape rarement comme il a ete saisi. Il faut deux chiffres au
 * moins pour chercher dans le telephone, sinon « 7 » ramenerait tout le club.
 */
export function joueurRepond(
    joueur: { first_name: string; last_name: string; email?: string | null; phone?: string | null },
    recherche: string,
): boolean {
    const aiguille = normalizeSearch(recherche)
    if (!aiguille) return true

    const prenomNom = normalizeSearch(`${joueur.first_name} ${joueur.last_name}`)
    const nomPrenom = normalizeSearch(`${joueur.last_name} ${joueur.first_name}`)
    if (prenomNom.includes(aiguille) || nomPrenom.includes(aiguille)) return true

    if (joueur.email && normalizeSearch(joueur.email).includes(aiguille)) return true

    const numero = chiffres(aiguille)
    return numero.length >= 2 && !!joueur.phone && chiffres(joueur.phone).includes(numero)
}

/** Les tableaux ou joue au moins un joueur correspondant a la recherche. */
export function groupesAvecJoueur<G extends Pick<Group, "players">>(groupes: G[], recherche: string): G[] {
    if (!normalizeSearch(recherche)) return groupes
    return groupes.filter(g => (g.players ?? []).some(p => joueurRepond(p, recherche)))
}

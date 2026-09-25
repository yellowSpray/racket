import type { Match } from "@/types/match"

/**
 * La pagination des terrains du planning.
 *
 * POURQUOI PAS UN DÉFILEMENT HORIZONTAL. La table du planning emporte sa
 * colonne des heures quand elle défile : parti chercher le terrain 6, on ne
 * sait plus sur quelle ligne on est. Figer cette colonne demanderait de passer
 * la table en `border-separate` et de redessiner tous ses filets, Chrome
 * n'honorant pas `position: sticky` sous `border-collapse: collapse`.
 *
 * La grille affiche donc autant de terrains que sa boîte en contient, jamais
 * une colonne coupée, et deux flèches passent aux suivants. Rien ne défile,
 * donc les heures ne bougent pas.
 *
 * LES DEUX COTES viennent de la mesure : 48 px pour la colonne des heures, et
 * 205 px pour un terrain, ce que demande une cellule dont les deux noms sont
 * empilés, badge de boxe et score compris. Elles vivent ici plutôt que dans le
 * composant pour que le calcul soit éprouvable sans navigateur.
 */

export const LARGEUR_HEURE = 48
export const PLANCHER_TERRAIN = 205

/** Combien de terrains tiennent dans une boîte de cette largeur. */
export function terrainsParPage(largeurBoite: number, nombreDeTerrains: number): number {
    const tiennent = Math.floor((largeurBoite - LARGEUR_HEURE) / PLANCHER_TERRAIN)
    return Math.min(nombreDeTerrains, Math.max(1, tiennent))
}

/**
 * La page ramenée dans ses bornes.
 *
 * Elle survit à un élargissement de la fenêtre : sept terrains par trois font
 * trois pages, par cinq ils n'en font plus que deux, et la page 2 devient la
 * dernière plutôt que de rendre une grille vide.
 */
export function pageValide(page: number, nombreDeTerrains: number, parPage: number): number {
    const dernierePage = Math.max(0, Math.ceil(nombreDeTerrains / parPage) - 1)
    return Math.min(Math.max(0, page), dernierePage)
}

/** Les terrains de cette page, la dernière restant plus courte. */
export function trancheDeTerrains(terrains: string[], page: number, parPage: number): string[] {
    return terrains.slice(page * parPage, page * parPage + parPage)
}

/**
 * « Terrains 1 a 3 sur 7 ».
 *
 * Des positions et non des noms : les en-têtes de colonnes portent déjà les
 * noms, et un club peut appeler ses terrains « Central » ou « Bulle ».
 */
export function libelleDeLaPage(page: number, parPage: number, total: number): string {
    const debut = page * parPage + 1
    const fin = Math.min(total, debut + parPage - 1)
    return debut === fin
        ? `Terrain ${debut} sur ${total}`
        : `Terrains ${debut} à ${fin} sur ${total}`
}

/**
 * Les terrains d'une journée, dans l'ordre.
 *
 * Relevés sur les matchs plutôt que sur la série : un terrain sans match n'a
 * pas de colonne à tenir. Sans aucun match placé, on retombe sur le nombre de
 * terrains de la série, ce qui donne une grille vide mais lisible.
 *
 * Ici et non dans le composant parce que la page en a besoin elle aussi : la
 * barre de pagination vit sur sa ligne de titre.
 */
export function terrainsDesMatchs(matchs: Match[], nombreDeTerrains = 1): string[] {
    const releves = [...new Set(matchs.map(m => m.court_number).filter(Boolean) as string[])].sort()
    if (releves.length > 0) return releves
    return Array.from({ length: nombreDeTerrains }, (_, i) => `Terrain ${i + 1}`)
}

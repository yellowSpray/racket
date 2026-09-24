import type { PlayerType } from "@/types/player"

/**
 * Les filtres de la liste des joueurs : leur liste, et la règle qui dit si un
 * joueur y répond.
 *
 * Dans un fichier à part et non dans le composant : exporter une fonction à
 * côté d'un composant casse le remplacement à chaud, et le composant des
 * filtres se trouve alors rechargé en entier à chaque modification de la page.
 * Même découpage que `HeaderSlotProvider` et `settingsSections`.
 */

export type FiltreJoueurs = "all" | "active" | "inactive" | "member" | "visitor" | "unpaid"

export const FILTRES_JOUEURS: { cle: FiltreJoueurs; libelle: string }[] = [
    { cle: "all", libelle: "Tous" },
    { cle: "active", libelle: "Actifs" },
    { cle: "inactive", libelle: "Inactifs" },
    { cle: "member", libelle: "Membres" },
    { cle: "visitor", libelle: "Visiteurs" },
    { cle: "unpaid", libelle: "Impayés" },
]

/**
 * Une seule règle pour filtrer et pour compter : deux règles jumelles
 * finiraient par diverger, et une pastille qui annonce un nombre différent de
 * ce que la liste montre est pire que pas de nombre.
 */
export function repondAuFiltre(joueur: PlayerType, filtre: FiltreJoueurs): boolean {
    if (filtre === "all") return true
    if (filtre === "unpaid") return joueur.payment_status === "unpaid"
    return joueur.status?.includes(filtre) ?? false
}

/** Les six comptes en une seule passe sur la liste. */
export function compterParFiltre(joueurs: PlayerType[]): Record<FiltreJoueurs, number> {
    const total: Record<FiltreJoueurs, number> = {
        all: 0, active: 0, inactive: 0, member: 0, visitor: 0, unpaid: 0,
    }
    for (const joueur of joueurs) {
        for (const { cle } of FILTRES_JOUEURS) {
            if (repondAuFiltre(joueur, cle)) total[cle] += 1
        }
    }
    return total
}

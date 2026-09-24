import { useMemo } from "react"
import type { PlayerType } from "@/types/player"
import {
    compterParFiltre,
    FILTRES_JOUEURS,
    type FiltreJoueurs,
} from "@/lib/filtresJoueurs"

/**
 * Les filtres de la liste des joueurs, en pastilles plutôt qu'en liste
 * déroulante.
 *
 * Une liste déroulante cache ses options et, surtout, ne dit pas combien de
 * joueurs chacune rendrait : il fallait l'ouvrir, choisir, lire le compte, et
 * recommencer pour comparer. Six pastilles portent leur compte, donc la
 * répartition du club se lit d'un coup d'œil sans rien toucher.
 *
 * TROIS NIVEAUX DE FOND, les mêmes que la barre latérale. Au repos un contour
 * sur le fond de carte, au survol un gris léger, et le filtre courant le gris
 * plein, avec le demi-gras en second indice au cas où les deux gris se
 * rapprocheraient sur un écran mal calibré.
 *
 * Le vert de la marque reste la couleur des actions et ne sert pas à dire
 * « vous êtes ici », décision du 11 septembre. Le noir plein a été essayé et
 * écarté : il consommait un contraste maximal pour une information qui n'est
 * ni une alerte ni une action. Les six pastilles gardent donc leur contour, et
 * seul le fond change d'une à l'autre : une silhouette qui reste la même se
 * compare plus vite.
 *
 * JUSQU'À 1024 PX INCLUS, LA LISTE DÉROULANTE REVIENT. Six pastilles font
 * 500 px à elles seules : elles passent sur une seconde rangée et repoussent
 * les actions d'autant. À 1024 la barre latérale se déploie et ne laisse que
 * 753 px de colonne, d'où ce seuil et non le `lg` de Tailwind, qui se
 * déclenche à 1024 pile. Un sélecteur tient sur la ligne du titre, et il garde
 * les comptes dans ses options, ce qui est le seul avantage des pastilles
 * qu'on pouvait sauver.
 *
 * Un `select` natif : le système ouvre sa propre roulette sur téléphone, le
 * clavier marche sans une ligne de code, et `data-liste-stylee` habille la
 * liste là où le navigateur le permet.
 */

export function FiltresJoueurs({
    joueurs,
    valeur,
    onChange,
}: {
    joueurs: PlayerType[]
    valeur: FiltreJoueurs
    onChange: (filtre: FiltreJoueurs) => void
}) {
    /*
     * Les six comptes en une passe sur la liste plutôt qu'une passe par
     * filtre : la liste fait 95 lignes aujourd'hui, mais elle est relue à
     * chaque frappe dans la recherche.
     */
    const comptes = useMemo(() => compterParFiltre(joueurs), [joueurs])

    return (
        <>
            <select
                data-filtre-joueurs-liste
                data-liste-stylee
                aria-label="Filtrer les joueurs"
                value={valeur}
                onChange={e => onChange(e.target.value as FiltreJoueurs)}
                className="h-8 rounded-full border border-border bg-card px-3 text-xs leading-8 text-foreground min-[1025px]:hidden"
            >
                {FILTRES_JOUEURS.map(({ cle, libelle }) => (
                    <option key={cle} value={cle}>{`${libelle} (${comptes[cle]})`}</option>
                ))}
            </select>

            <div
                data-filtres-joueurs
                role="group"
                aria-label="Filtrer les joueurs"
                className="hidden flex-wrap items-center gap-2 min-[1025px]:flex"
            >
                {FILTRES_JOUEURS.map(({ cle, libelle }) => {
                    const courant = cle === valeur
                    return (
                        <button
                            key={cle}
                            type="button"
                            aria-pressed={courant}
                            onClick={() => onChange(cle)}
                            className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors ${
                                courant
                                    ? "border-border bg-muted font-semibold text-foreground"
                                    : "border-border bg-card text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                            }`}
                        >
                            {libelle}
                            {/*
                              * Le compte hérite de la couleur du libellé et se
                              * contente d'une opacité, plutôt que d'un token de
                              * gris qui aurait à tenir sur les deux fonds.
                              */}
                            <span className="tabular-nums opacity-60">{comptes[cle]}</span>
                        </button>
                    )
                })}
            </div>
        </>
    )
}

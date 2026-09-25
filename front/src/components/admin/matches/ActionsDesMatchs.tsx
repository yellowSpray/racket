import type { ComponentType } from "react"
import {
    ListViewIcon,
    GridViewIcon,
    PencilEdit01Icon,
    FloppyDiskIcon,
    Cancel01Icon,
} from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { ACTION_DE_PAGE, ACTION_VERTE } from "@/lib/actionPage"

/*
 * Les actions de l'ecran des matchs, sur la ligne du titre.
 *
 * Elles vivaient dans le header, en quatre gabarits differents : un rond de
 * 40 px pour la vue, un bouton vert plein de 44 pour Modifier, un rond pour
 * Annuler, un second vert plein pour Enregistrer. Le header porte ce qui vaut
 * pour toute l'application ; ces quatre-la ne valent que pour cette page.
 *
 * Meme gabarit que les tableaux et les joueurs, `lib/actionPage` : carre de
 * 32 px sous 640, libelle au-dela, contour neutre au repos. Seul Enregistrer
 * prend une couleur, et seulement au survol : c'est la seule des quatre qui
 * ecrit en base.
 *
 * LA BASCULE DE VUE EST NOMMEE PAR CE QU'ELLE FAIT, « Liste » ou « Grille »,
 * comme « Points » et « Scores » sur les tableaux. Un bouton etiquete par
 * l'etat courant dit le contraire de ce que le clic produit. Reduit au
 * pictogramme sur telephone, c'est lui seul qui distingue les deux etats,
 * d'ou deux pictogrammes differents et non deux libelles sur le meme.
 */

function Action({
    icone: Icone, libelle, infobulle, onClick, classe = "", desactive = false,
}: {
    icone: ComponentType<{ size?: number; strokeWidth?: number }>
    libelle: string
    infobulle: string
    onClick: () => void
    classe?: string
    desactive?: boolean
}) {
    return (
        <Button
            variant="outline"
            size="sm"
            className={`${ACTION_DE_PAGE} ${classe}`}
            onClick={onClick}
            disabled={desactive}
            title={infobulle}
        >
            <Icone size={16} strokeWidth={2} />
            <span data-libelle className="sr-only sm:not-sr-only">{libelle}</span>
        </Button>
    )
}

export function ActionsDesMatchs({
    vue, onBasculerVue, modeEdition, onModifier, onAnnuler, onEnregistrer, peutModifier,
}: {
    vue: "grid" | "list"
    onBasculerVue: () => void
    modeEdition: boolean
    onModifier: () => void
    onAnnuler: () => void
    onEnregistrer: () => void
    /** Faux tant que la serie n'a aucun match : rien a afficher ni a saisir. */
    peutModifier: boolean
}) {
    if (!peutModifier) return null

    return (
        <div className="ml-auto flex shrink-0 items-center gap-2">
            {vue === "grid" ? (
                <Action icone={ListViewIcon} libelle="Liste" infobulle="Afficher la liste" onClick={onBasculerVue} />
            ) : (
                <Action icone={GridViewIcon} libelle="Grille" infobulle="Afficher la grille" onClick={onBasculerVue} />
            )}

            {modeEdition ? (
                <>
                    <Action icone={Cancel01Icon} libelle="Annuler" infobulle="Quitter sans enregistrer" onClick={onAnnuler} />
                    <Action
                        icone={FloppyDiskIcon}
                        libelle="Enregistrer"
                        infobulle="Enregistrer les scores saisis"
                        onClick={onEnregistrer}
                        classe={ACTION_VERTE}
                    />
                </>
            ) : (
                <Action icone={PencilEdit01Icon} libelle="Modifier" infobulle="Saisir les scores" onClick={onModifier} />
            )}
        </div>
    )
}

import type { ComponentType } from "react"
import { HashtagIcon, StarIcon, Download01Icon, CodeIcon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { ACTION_DE_PAGE } from "@/lib/actionPage"

/*
 * Les trois actions de l'ecran des tableaux, sur la ligne du titre.
 *
 * Le gabarit vit dans `lib/actionPage` : il est partage avec la liste des
 * joueurs, et une chaine de classes recopiee dans deux fichiers diverge au
 * premier reglage fait dans un seul des deux.
 *
 * « Points » et « Scores » sont deux etats du meme bouton. Pictogramme seul sur
 * telephone, seul le pictogramme les distingue : un diese pour les points, une
 * etoile pour les scores, et un `title` qui dit ce que le clic va faire.
 */

function Action({
    icone: Icone, libelle, infobulle, onClick,
}: {
    icone: ComponentType<{ size?: number; strokeWidth?: number }>
    libelle: string
    infobulle: string
    onClick: () => void
}) {
    return (
        <Button variant="outline" size="sm" className={ACTION_DE_PAGE} onClick={onClick} title={infobulle}>
            <Icone size={16} strokeWidth={2} />
            <span data-libelle className="sr-only sm:not-sr-only">{libelle}</span>
        </Button>
    )
}

export function ActionsDesTableaux({
    displayMode, onToggleDisplay, onEmbed, onExportPdf, peutExporter,
}: {
    displayMode: "score" | "points"
    onToggleDisplay: () => void
    onEmbed: () => void
    onExportPdf: () => void
    /** Faux quand la serie n'a encore aucun tableau : rien a exporter. */
    peutExporter: boolean
}) {
    return (
        <div className="ml-auto flex shrink-0 items-center gap-2">
            {displayMode === "score" ? (
                <Action icone={HashtagIcon} libelle="Points" infobulle="Afficher les points" onClick={onToggleDisplay} />
            ) : (
                <Action icone={StarIcon} libelle="Scores" infobulle="Afficher les scores" onClick={onToggleDisplay} />
            )}
            <Action icone={CodeIcon} libelle="Intégrer" infobulle="Intégrer les tableaux sur un site" onClick={onEmbed} />
            {peutExporter && (
                <Action icone={Download01Icon} libelle="PDF" infobulle="Télécharger les tableaux en PDF" onClick={onExportPdf} />
            )}
        </div>
    )
}

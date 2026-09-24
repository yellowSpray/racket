import type { ComponentType } from "react"
import { HashtagIcon, StarIcon, Download01Icon, CodeIcon } from "hugeicons-react"
import { Button } from "@/components/ui/button"

/*
 * Les trois actions de l'ecran des tableaux, sur la ligne du titre.
 *
 * SUR TELEPHONE, LE PICTOGRAMME SEUL. Avec leurs libelles, meme compactees,
 * elles faisaient pres de 200 px et passaient sur une seconde ligne sous le
 * titre, calees a droite, detachees de lui. Carrees de 32 px, la hauteur des
 * pastilles du header, elles tiennent a trois dans 112 px et restent sur la
 * ligne du titre.
 *
 * Le libelle ne disparait pas : `sr-only` le garde pour un lecteur d'ecran, et
 * le `title` le donne au survol. Au-dessus de 640 il revient a l'ecran.
 *
 * « Points » et « Scores » sont deux etats du meme bouton. Pictogramme seul,
 * seul le pictogramme les distingue : un diese pour les points, une etoile
 * pour les scores, et un `title` qui dit ce que le clic va faire.
 */
const ACTION =
    "border size-8 px-0 has-[>svg]:px-0 " +
    "sm:w-auto sm:px-3 sm:has-[>svg]:px-2.5"

function Action({
    icone: Icone, libelle, infobulle, onClick,
}: {
    icone: ComponentType<{ size?: number; strokeWidth?: number }>
    libelle: string
    infobulle: string
    onClick: () => void
}) {
    return (
        <Button variant="outline" size="sm" className={ACTION} onClick={onClick} title={infobulle}>
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

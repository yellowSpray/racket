import { ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { libelleDeLaPage } from "@/lib/paginationTerrains"

/**
 * Les deux flèches qui changent de page de terrains, sur la ligne du titre.
 *
 * Elles ne paraissent que lorsqu'un terrain ne tient pas dans la largeur : à
 * trois terrains sur un écran de bureau, cette barre n'existe pas. C'est la
 * page qui en décide, elle seule connaît la largeur de sa colonne.
 *
 * Même grammaire que la barre de dates, deux pas de côté et un libellé au
 * milieu. Le libellé compte des positions et non des noms, les en-têtes de
 * colonnes portant déjà les noms ; il s'efface sous 768 px, où la ligne du
 * titre porte déjà le titre, la date et deux actions.
 */
export function PaginationDesTerrains({
    page, parPage, total, onChange,
}: {
    page: number
    parPage: number
    total: number
    onChange: (page: number) => void
}) {
    if (parPage >= total) return null

    const dernierePage = Math.ceil(total / parPage) - 1

    return (
        <div data-pagination-terrains className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs text-muted-foreground md:inline">
                {libelleDeLaPage(page, parPage, total)}
            </span>
            <Fleche
                libelle="Terrains precedents"
                desactivee={page === 0}
                onClick={() => onChange(page - 1)}
                icone={<ArrowLeft01Icon size={14} strokeWidth={2} />}
            />
            <Fleche
                libelle="Terrains suivants"
                desactivee={page >= dernierePage}
                onClick={() => onChange(page + 1)}
                icone={<ArrowRight01Icon size={14} strokeWidth={2} />}
            />
        </div>
    )
}

function Fleche({
    libelle, desactivee, onClick, icone,
}: {
    libelle: string
    desactivee: boolean
    onClick: () => void
    icone: React.ReactNode
}) {
    return (
        <Button
            variant="outline"
            size="sm"
            className="size-8 shrink-0 px-0 has-[>svg]:px-0"
            aria-label={libelle}
            title={libelle}
            disabled={desactivee}
            onClick={onClick}
        >
            {icone}
        </Button>
    )
}

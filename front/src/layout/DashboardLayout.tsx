import type { ReactNode } from "react"
import { useHeaderSlotRegister } from "@/contexts/HeaderSlotContext"

/**
 * La coque de l'application : barre latérale à gauche, contenu à droite.
 *
 * La version précédente posait une grille de 24 colonnes, la barre latérale
 * prenant `col-span-1` et le contenu `col-span-23`. Cette largeur n'en était
 * pas une : à 1440 px elle tombait par hasard sur 42 px, la taille d'un bouton
 * rond, et à 375 px les vingt-trois gouttières de 16 px faisaient à elles
 * seules 368 px pour 311 px utiles. Toutes les colonnes étaient écrasées à
 * zéro et la barre disparaissait sous son propre contenu. Une largeur en
 * pixels ne peut pas se faire écraser de cette façon.
 *
 * La tête de la colonne de contenu accueille le slot gauche du header, où les
 * pages déposent leur titre, mais aussi leur recherche et leurs filtres. Le
 * nouveau header n'a plus de place pour eux, et c'est là que la maquette pose
 * « Dashboard ». Les pages continuent d'appeler `useHeaderSlot` sans changement.
 *
 * Les deux colonnes démarrent au même retrait sous le header, et cette bande de
 * titre fait la hauteur d'une entrée de menu : la première entrée de la barre
 * et le titre de la page se lisent donc sur la même ligne. `min-h` et non `h`,
 * parce que plusieurs pages posent aussi une recherche ou un filtre ici, plus
 * hauts qu'un titre seul.
 */
export default function DashboardLayout({
    sidebar,
    children,
}: {
    sidebar?: ReactNode
    children: ReactNode
}) {
    const registerSlot = useHeaderSlotRegister()

    return (
        <div className="flex min-h-0 flex-1">

            {sidebar && (
                <aside className="flex w-[207px] shrink-0 flex-col border-r border-border bg-card px-2.5 pt-6 pb-2">
                    {sidebar}
                </aside>
            )}

            <section className="flex min-h-0 min-w-0 flex-1 flex-col px-8 py-6">
                <div
                    ref={registerSlot}
                    data-page-heading
                    className="flex min-h-[34px] min-w-0 items-center gap-3 empty:hidden [&:not(:empty)]:mb-4"
                />
                {children}
            </section>

        </div>
    )
}

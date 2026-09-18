import type { ReactNode } from "react"
import { useHeaderSlotRegister } from "@/contexts/HeaderSlotContext"
import { GOUTTIERE, RAIL, RAIL_PADDING } from "@/layout/rail"

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
    onglets,
    children,
}: {
    sidebar?: ReactNode
    /**
     * La meme navigation, en onglets au bas de l'ecran, sous 640 px. Elle est
     * rendue hors de l'`aside` : celui-ci est masque a cette largeur, et un
     * element `fixed` place dans un parent en `display: none` ne s'affiche pas.
     */
    onglets?: ReactNode
    children: ReactNode
}) {
    const registerSlot = useHeaderSlotRegister()

    return (
        <div className="flex min-h-0 flex-1">

            {sidebar && (
                <aside className={`hidden shrink-0 flex-col border-r border-border bg-card pt-6 pb-6 sm:flex ${RAIL} ${RAIL_PADDING}`}>
                    {sidebar}
                </aside>
            )}

            {/*
              * Le bas laisse passer la barre d'onglets, 56 px plus la zone sure
              * des telephones a barre de geste. Elle est `fixed` : sans ce
              * retrait, elle couvrirait la derniere ligne du contenu.
              */}
            <section className={`flex min-h-0 min-w-0 flex-1 flex-col pt-6 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1.5rem)] sm:pb-6 ${GOUTTIERE}`}>
                {/*
                  * Le contenu a une largeur, et les marges absorbent le reste.
                  *
                  * 2200 px, soit quatre tableaux de box de 532 avec leurs trois
                  * gouttieres de 24. Ce n'est pas un chiffre rond par hasard :
                  * un tableau de box mesure 519 px au minimum, somme de ses
                  * planchers de colonnes, et 532 au maximum. Il ne se negocie
                  * pas, donc c'est lui qui fixe le pas de toute l'application.
                  *
                  * Au-dela, la colonne cesse de s'etirer et se centre. Un
                  * tableau de matchs de 2500 px de large n'est pas plus lisible
                  * qu'un de 2200, il est seulement plus fatigant a parcourir de
                  * l'oeil.
                  */}
                <div
                    data-contenu-borne
                    className="mx-auto flex min-h-0 w-full max-w-[2200px] flex-1 flex-col"
                >
                    {/*
                      * `flex-wrap` : les actions de page passent sous le titre
                      * quand la ligne ne les tient plus. Les trois boutons des
                      * tableaux font 271 px a eux seuls, soit plus que la
                      * colonne d'un telephone une fois le titre servi, et la
                      * page debordait de 56 px a 320.
                      *
                      * Elles gardent leurs libelles en passant a la ligne : un
                      * pictogramme seul rendrait « Points » et « Scores »
                      * indistinguables, et c'est l'etat du bouton qui compte.
                      *
                      * `shrink-0` va avec : cette bande est un element d'une
                      * colonne flex bornee en hauteur, donc sans lui elle reste
                      * ecrasee a ses 34 px pendant que sa seconde ligne deborde
                      * sous le contenu.
                      */}
                    <div
                        ref={registerSlot}
                        data-page-heading
                        className="flex min-h-[34px] min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 empty:hidden [&:not(:empty)]:mb-4"
                    />
                    {children}
                </div>
            </section>

            {onglets}

        </div>
    )
}

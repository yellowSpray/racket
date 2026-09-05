import { useLayoutEffect, type RefObject } from "react"
import { computeZoom } from "@/lib/fitToWidth"

/**
 * Reduit un contenu trop large plutot que de le faire defiler.
 *
 * Les anciens tableaux du club etaient publies en image : une image se
 * redimensionne, elle tient donc sur n'importe quel telephone. Un tableau HTML
 * non : passe une certaine etroitesse ses colonnes ne peuvent plus retrecir et
 * une barre de defilement apparait. On reproduit le comportement de l'image.
 *
 * `zoom` plutot que `transform: scale()` : `transform` ne change pas la place
 * occupee, le tableau reduit laisserait un vide de la hauteur qu'il avait
 * avant. `zoom` refait la mise en page, la hauteur suit, et le cadre integre
 * annonce la bonne valeur a la page qui l'accueille.
 *
 * @param ref - conteneur a reduire
 * @param signature - change quand le contenu change, pour remesurer
 * @param contentSelector - element dont la largeur naturelle fait foi. Sans
 *   lui on mesure le conteneur, ce qui ne renseigne sur rien des qu'un
 *   descendant defile pour son compte : c'est le cas du tableau shadcn, qui
 *   pose son propre `overflow-x-auto` et absorbe donc tout le debordement.
 */
export function useFitToWidth(
    ref: RefObject<HTMLElement | null>,
    signature: unknown,
    contentSelector?: string,
) {
    useLayoutEffect(() => {
        const node = ref.current
        const parent = node?.parentElement
        if (!node || !parent) return

        const ajuster = () => {
            // Mesure a taille reelle : un zoom deja pose fausserait les deux.
            node.style.zoom = "1"
            const contenu = contentSelector
                ? node.querySelector<HTMLElement>(contentSelector) ?? node
                : node
            /*
             * La place disponible se lit sur le noeud lui-meme, pas sur son
             * parent : `clientWidth` retire ses bordures, et surtout le parent
             * peut etre une grille dont la largeur est celle de toute la
             * rangee, pas celle de la colonne ou vit le noeud.
             */
            node.style.zoom = String(computeZoom(node.clientWidth, contenu.scrollWidth))
        }

        ajuster()

        /*
         * On observe le parent, pas le noeud lui-meme : le parent garde sa
         * largeur quel que soit le zoom applique au noeud, donc la mesure ne
         * peut pas se declencher elle-meme en boucle.
         */
        const observer = new ResizeObserver(ajuster)
        observer.observe(parent)

        return () => {
            observer.disconnect()
            node.style.zoom = ""
        }
    }, [ref, signature, contentSelector])
}

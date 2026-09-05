/**
 * Reduction d'un contenu trop large pour la place disponible.
 *
 * Une box de six joueurs fait huit colonnes : passe une certaine etroitesse,
 * ses colonnes ne peuvent plus retrecir et le tableau deborde. Les anciens
 * tableaux du club etaient des images, qui se redimensionnent : on reproduit
 * ce comportement en reduisant l'affichage plutot qu'en faisant apparaitre une
 * barre de defilement.
 */

/**
 * En dessous, le texte devient illisible : mieux vaut alors laisser le
 * defilement horizontal reprendre la main.
 */
export const MIN_ZOOM = 0.6

/**
 * Facteur a appliquer pour qu'un contenu de `natural` pixels tienne dans
 * `available`.
 *
 * Rend 1 quand le contenu tient deja, quand une des deux mesures est absente
 * (premier rendu, element detache) ou aberrante : ne rien reduire est toujours
 * le comportement sur : au pire la barre reste, elle ne cache rien.
 */
export function computeZoom(available: number, natural: number): number {
    if (!Number.isFinite(available) || !Number.isFinite(natural)) return 1
    if (available <= 0 || natural <= 0) return 1
    if (natural <= available) return 1
    return Math.max(MIN_ZOOM, available / natural)
}

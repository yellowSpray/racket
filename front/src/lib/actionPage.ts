/**
 * Le gabarit des actions posées sur la ligne de titre d'une page.
 *
 * SUR TÉLÉPHONE, LE PICTOGRAMME SEUL. Avec leurs libellés, même compactées,
 * trois actions font près de 200 px et passent sur une seconde ligne sous le
 * titre, calées à droite, détachées de lui. Carrées de 32 px, la hauteur des
 * pastilles du header, elles tiennent à trois dans 112 px et restent sur la
 * ligne du titre.
 *
 * Le libellé ne disparaît pas pour autant : le composant qui emploie ce
 * gabarit le garde en `sr-only` et le rend au-dessus de 640 px.
 *
 * Partagé entre les tableaux et les joueurs : une chaîne de classes recopiée
 * dans deux fichiers diverge au premier réglage fait dans un seul des deux.
 */
export const ACTION_DE_PAGE =
    "border size-8 px-0 has-[>svg]:px-0 " +
    "sm:w-auto sm:px-3 sm:has-[>svg]:px-2.5"

/**
 * La couleur ne vient qu'au survol et au foyer.
 *
 * Au repos les actions sont neutres, contour sur fond de carte : trois boutons
 * pleins alignés sur une ligne de titre se disputent l'attention avec le titre
 * lui-même, et le rouge d'une suppression n'a pas à crier tant que personne ne
 * l'a désignée. Au survol, chacune prend la couleur de ce qu'elle fait.
 */
export const ACTION_VERTE =
    "hover:border-primary hover:bg-primary hover:text-primary-foreground " +
    "focus-visible:border-primary focus-visible:bg-primary focus-visible:text-primary-foreground"

export const ACTION_ROUGE =
    "hover:border-destructive hover:bg-destructive hover:text-destructive-foreground " +
    "focus-visible:border-destructive focus-visible:bg-destructive focus-visible:text-destructive-foreground"

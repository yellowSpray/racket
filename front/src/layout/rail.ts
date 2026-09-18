/**
 * La colonne de gauche, en un seul endroit, et ses trois états.
 *
 * Trois choses sont calées dessus et doivent bouger ensemble : la barre
 * latérale elle-même, le bloc de marque du header qui occupe exactement sa
 * colonne, et le fil d'Ariane qui démarre juste après. Les tenir synchronisées
 * à la main, c'est les désynchroniser un jour sans que personne ne comprenne
 * pourquoi le logo flotte au-dessus du contenu.
 *
 *   sous 640     rien. La navigation descend en onglets au bas de l'écran.
 *   640 a 1023   54 px, les pictogrammes seuls. Une pastille carree de 34 px,
 *                la hauteur d'une entree, avec ses 10 px de retrait.
 *   1024 et plus 207 px, la barre montre ses libelles.
 *
 * Les deux seuils sont mesurés, pas choisis dans la liste de Tailwind.
 *
 * 1024 : un tableau de box demande 519 px plus les deux gouttières de 32, soit
 * 583. Avec la barre déployée il faut 791 px de fenêtre pour qu'il tienne, avec
 * le rail 638.
 *
 * 640 : le fil d'Ariane a besoin de 336 px pour montrer ses trois segments en
 * entier, et il se coupe dès que la fenêtre passe sous 582. `sm` tombe juste
 * au-dessus et garde 58 px de marge pour un nom de club plus long.
 */
export const RAIL = "w-auto sm:w-[54px] lg:w-[207px]"

/** Le retrait intérieur de la colonne, dans ses trois états. */
export const RAIL_PADDING = "pl-4 sm:px-2.5 lg:pl-8 lg:pr-2.5"

/** L'annulation de ce retrait, pour les filets qui traversent de bord à bord. */
export const RAIL_BLEED = "-mx-2.5 lg:-ml-8 lg:-mr-2.5"

/**
 * La gouttière verticale, header et contenu.
 *
 * 32 px partout, sauf sur téléphone où elles coûtaient 64 des 375 disponibles.
 * Elles y descendent à 16 : la barre latérale ayant quitté l'écran, la colonne
 * de gauche ne réclame plus rien, et le fil d'Ariane a besoin de ses 336 px.
 */
export const GOUTTIERE = "px-4 sm:px-8"

/*
 * Le gabarit commun des trois formulaires d'accès : connexion, inscription,
 * mot de passe oublié. Un seul endroit, pour qu'ils ne divergent pas.
 */

/*
 * Une colonne de 400 px au plus, pleine largeur en dessous.
 *
 * Avant, la carte faisait `w-1/2` d'un panneau qui faisait lui-même la moitié
 * de l'écran : 240 px de champs à 1024, 80 à 320. Sous 1024 elle s'aligne en
 * haut, sous le bandeau ; au-dessus elle se centre dans sa moitié, à côté de
 * l'image.
 */
export const CARTE_ACCES =
    "w-full max-w-[400px] gap-6 border-none bg-transparent pt-6 pb-8 shadow-none " +
    "lg:h-full lg:justify-center lg:py-6"

/*
 * Sans retrait propre sous 1024 : la page porte déjà sa gouttière, et 24 px de
 * plus de chaque côté coûtaient 48 des 288 px d'un écran de 320.
 */
export const RETRAIT_ACCES = "px-0 lg:px-6"

/*
 * Le titre de la page, en `h1`. L'écran d'accès n'a pas de header : ce titre
 * est la première chose lue, il n'a plus à ressembler à l'intertitre d'une
 * carte de l'application.
 */
export const TITRE_ACCES = "text-2xl leading-tight font-semibold tracking-tight"

/*
 * 44 px sous 1024, la hauteur d'une cible au doigt ; les 36 et 40 de shadcn
 * au-dessus, où l'on vise à la souris.
 */
export const CHAMP_ACCES = "h-11 lg:h-9"
export const BOUTON_ACCES = "h-11 lg:h-10"

/*
 * Les liens textuels, « S'inscrire », « Mot de passe oublié ? », faisaient
 * 20 px de haut, sous les 24 du minimum WCAG 2.2. Leur zone de toucher passe à
 * 44 px sous 1024, et les marges négatives la rendent à la ligne : le texte ne
 * bouge pas d'un pixel, seule la surface qu'on touche grandit.
 */
export const LIEN_ACCES = "max-lg:-my-3 max-lg:h-11"

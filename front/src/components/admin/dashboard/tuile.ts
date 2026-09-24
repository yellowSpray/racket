/*
 * Les retraits des trois tuiles du dashboard, en un seul endroit.
 *
 * 24 px a partir de 768, le gabarit pose le 11 septembre. En dessous, 16 : a
 * 320 px la carte n'a que 254 px de contenu avec ces retraits, contre 238
 * avec ceux du bureau, et ces seize pixels sont la difference entre
 * « Nicolas Debusschere » et « Nicolas Debu… ».
 *
 * Les trois tuiles le portent, et pas seulement celle des matchs : elles
 * defilent l'une apres l'autre dans le carrousel, un retrait qui change d'une
 * carte a la suivante se verrait au premier balayage.
 */
export const TUILE = "py-4 md:py-6"
export const TUILE_RETRAIT = "px-4 md:px-6"

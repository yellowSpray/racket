/**
 * Le correctif de largeur du `ScrollArea` de Radix, en un seul endroit.
 *
 * Radix enveloppe les enfants de sa zone défilante dans un `div` en
 * `display: table; min-width: 100%`. Une boîte de table se dimensionne sur son
 * contenu : l'enfant cesse donc d'être borné par la colonne qui l'accueille, il
 * s'élargit jusqu'à sa largeur naturelle, et c'est la page entière qui part en
 * défilement horizontal.
 *
 * Mesuré deux fois, sur deux écrans différents. Sur les tableaux, la grille
 * réclamait 519 px de piste dans une colonne de 343, et `useFitToWidth` ne
 * rattrapait rien puisqu'il voyait une place plus large que son contenu. Sur le
 * dashboard, les lignes de la carte des matchs sortaient de leur carte par la
 * droite, bordure comprise.
 *
 * `display: block` rend à cet enfant le comportement attendu : il prend la
 * largeur qu'on lui donne, et ce qui dépasse défile dans la zone au lieu de
 * pousser la page.
 *
 * Posé au cas par cas et non sur le composant : `components/ui` ne s'édite pas
 * à la main, et une zone qui défile volontairement à l'horizontale, comme la
 * grille de planning, n'a peut-être pas le même besoin. Cinq des dix zones du
 * produit le portent, celles dont le défaut a été mesuré.
 */
export const BLOC_DEFILANT = "[&>[data-radix-scroll-area-viewport]>div]:!block"

/**
 * La barre de défilement masquée sur téléphone.
 *
 * Sous 640 px elle coûtait 12 px de large à ce qu'elle fait défiler : les 10
 * de la barre elle-même, et le `pr-3` que `ScrollArea` pose sur son contenu
 * dès qu'elle est visible. Sur les tableaux, ces 12 px allaient au facteur de
 * réduction de `useFitToWidth`. On défile au doigt, la barre n'y sert à rien.
 *
 * Deux règles, parce que masquer la barre ne suffit pas : son `data-state`
 * reste « visible » et le `:has()` de `components/ui` continue de poser le
 * retrait. Le `!` l'emporte sur sa spécificité, sans éditer le composant.
 *
 * Au-dessus de 640 la barre revient : à la souris, c'est elle qui dit qu'il y
 * a une suite.
 */
export const BARRE_MASQUEE_TELEPHONE =
    "max-sm:[&>[data-slot=scroll-area-scrollbar]]:hidden " +
    "max-sm:[&>[data-slot=scroll-area-viewport]>div]:!pr-0"

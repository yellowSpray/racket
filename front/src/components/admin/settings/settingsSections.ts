import {
    Building02Icon,
    VolleyballIcon,
    Calendar03Icon,
    Award01Icon,
    ArrowUpDownIcon,
} from "hugeicons-react"

/**
 * Les rubriques de la page de reglages du club.
 *
 * Elles vivent a part de `SettingsManager` pour une raison mecanique : un
 * fichier qui exporte un composant ET autre chose n'est plus rechargeable a
 * chaud. Fast Refresh remplace un composant en place, mais il ne sait pas ce
 * que devient une constante deja lue par un autre module, alors il recharge la
 * page entiere. Modifier une ligne de `SettingsManager` faisait donc perdre la
 * rubrique ouverte et le formulaire en cours de saisie.
 *
 * Le contenu est inchange, seul son emplacement bouge.
 */

export interface SettingsSection {
    id: string
    label: string
    /** Phrase affichee en tete du panneau, qui dit sur quoi la rubrique agit. */
    hint: string
    icon: typeof Building02Icon
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
    {
        id: "club",
        label: "Club",
        hint: "Identite de votre club, visible par tous les joueurs.",
        icon: Building02Icon,
    },
    {
        id: "courts",
        label: "Terrains",
        hint: "Copies automatiquement dans chaque nouvel événement.",
        icon: VolleyballIcon,
    },
    {
        id: "defaults",
        label: "Valeurs par défaut",
        hint: "Point de départ des nouveaux événements : horaires, durée de match, taille des groupes, visiteurs.",
        icon: Calendar03Icon,
    },
    {
        id: "scoring",
        label: "Pointage",
        hint: "Barème appliqué aux nouveaux événements. Chaque événement peut ensuite avoir le sien.",
        icon: Award01Icon,
    },
    {
        id: "promotion",
        label: "Montées et descentes",
        hint: "Règle appliquée aux nouveaux événements. Chaque événement peut ensuite avoir la sienne.",
        icon: ArrowUpDownIcon,
    },
]

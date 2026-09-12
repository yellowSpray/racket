import { Link } from "react-router"
import { Logout03Icon } from "hugeicons-react"
import type { ComponentType } from "react"

/**
 * Les briques communes aux deux barres latérales, admin et joueur.
 *
 * Les mesures viennent de la maquette du 11 septembre : entrée de 34 px,
 * pastille active en retrait de 10 px de chaque côté, icône de 16 px suivie
 * de 10 px d'écart avant le libellé.
 *
 * TROIS NIVEAUX DE FOND, et deux indices pour les distinguer.
 *
 *   au repos   transparent                texte a 70 %
 *   survol     `bg-muted/60`              texte plein
 *   courant    `bg-muted`, `font-semibold` texte plein
 *
 * L'état courant ne porte plus la couleur de marque. Le vert est celle des
 * actions ; s'en servir pour dire « vous êtes ici » le faisait lire comme un
 * bouton, et privait la barre d'un accent resté disponible pour signaler autre
 * chose. Le survol reste plus clair que l'état courant, sinon il annoncerait
 * une sélection qui n'a pas eu lieu, et l'état courant s'assombrit encore au
 * survol pour rappeler qu'il reste cliquable.
 *
 * Le repos passe de `text-muted-foreground` à `text-foreground/70` : le premier
 * donnait un gris à 2.6 pour 1 sur le fond de la barre, sous le minimum lisible.
 */

export interface SidebarEntry {
    label: string
    to: string
    icon: ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>
    /** Vrai pour une racine comme `/admin`, qui ne doit pas s'allumer sur ses sous-pages. */
    exact?: boolean
}

/** L'entrée est active si la route correspond, ou la contient pour une section. */
function estActive(entry: SidebarEntry, pathname: string): boolean {
    if (entry.exact) return pathname === entry.to
    return pathname === entry.to || pathname.startsWith(`${entry.to}/`)
}

/** Groupe d'entrées. Les groupes sont séparés par `SidebarSeparator`. */
export function SidebarGroup({ entries, pathname }: { entries: SidebarEntry[]; pathname: string }) {
    return (
        <div className="flex flex-col gap-2">
            {entries.map(entry => {
                const Icon = entry.icon
                const active = estActive(entry, pathname)
                return (
                    <Link
                        key={entry.to}
                        to={entry.to}
                        aria-current={active ? "page" : undefined}
                        className={`flex h-[34px] items-center gap-2.5 rounded-md px-2.5 transition-colors ${
                            active
                                ? "bg-muted font-semibold text-foreground hover:bg-border"
                                : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                        }`}
                    >
                        <Icon size={16} strokeWidth={2} className="shrink-0" />
                        <span className="truncate">{entry.label}</span>
                    </Link>
                )
            })}
        </div>
    )
}

/*
 * Le filet traverse la barre de bord à bord : il annule ses deux retraits, 32 px
 * à gauche et 10 à droite. Il sépare la colonne entière, pas la colonne de
 * texte, et rejoint ainsi le trait qui borde la barre.
 */
export function SidebarSeparator() {
    return <div data-sidebar-separator className="-ml-8 -mr-2.5 my-3 h-px bg-border" />
}

/** Pied de barre, poussé en bas : aujourd'hui la seule déconnexion. */
export function SidebarSignOut({ onSignOut }: { onSignOut: () => void }) {
    return (
        <div data-sidebar-footer className="mt-auto">
            <div className="-ml-8 -mr-2.5 mb-2 h-px bg-border" />
            <button
                type="button"
                onClick={onSignOut}
                className="flex h-[34px] w-full items-center gap-2.5 rounded-md px-2.5 text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
                <Logout03Icon size={16} strokeWidth={2} className="shrink-0" />
                <span>Quitter</span>
            </button>
        </div>
    )
}

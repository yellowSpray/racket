import { Link } from "react-router"
import type { SidebarEntry } from "@/components/shared/SidebarNav"

/**
 * La navigation du téléphone : une barre d'onglets au bas de l'écran.
 *
 * Sous 640 px la barre latérale ne peut plus être une colonne. Déployée elle
 * occupe 207 px, soit 55 % d'un écran de 375 ; même repliée à 54, elle vole de
 * la largeur, qui est la dimension rare sur un téléphone, alors que la hauteur
 * ne l'est pas. Elle descend donc en bas, où le pouce l'atteint.
 *
 * CINQ ONGLETS AU MAXIMUM. Au-delà, chaque onglet passe sous les 44 px que
 * demande une cible tactile sur un écran de 320. Les six entrées de l'admin ne
 * tiennent donc pas : `Réglages` et `Quitter` descendent dans la page profil,
 * que l'avatar du header ouvre déjà. Ce sont les deux gestes qu'on fait
 * rarement, et ils n'ont rien à voir avec la consultation quotidienne.
 *
 * `fixed` et non `sticky` : la barre ne doit pas se décoller quand le contenu
 * défile, et `DashboardLayout` réserve sa hauteur au bas du contenu. Le
 * `env(safe-area-inset-bottom)` évite qu'elle se loge sous la barre de geste
 * des iPhone récents.
 */
export function BottomTabs({ entries, pathname }: { entries: SidebarEntry[]; pathname: string }) {
    return (
        <nav
            data-onglets
            aria-label="Navigation principale"
            className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
            {entries.map(entry => {
                const Icon = entry.icon
                const active = entry.exact
                    ? pathname === entry.to
                    : pathname === entry.to || pathname.startsWith(`${entry.to}/`)
                return (
                    <Link
                        key={entry.to}
                        to={entry.to}
                        aria-current={active ? "page" : undefined}
                        className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                            active ? "font-semibold text-foreground" : "text-foreground/70"
                        }`}
                    >
                        <Icon size={20} strokeWidth={2} className="shrink-0" />
                        <span className="text-[10px] leading-none">{entry.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}

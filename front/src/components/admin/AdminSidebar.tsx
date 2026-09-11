import { useLocation } from "react-router"
import {
    DashboardSquare02Icon, LayoutTable02Icon, File01Icon,
    UserGroupIcon, Mail01Icon, Settings01Icon,
} from "hugeicons-react"
import { useAuth } from "@/contexts/AuthContext"
import { SidebarGroup, SidebarSeparator, SidebarSignOut, type SidebarEntry } from "@/components/shared/SidebarNav"

/**
 * Barre latérale de l'administration.
 *
 * Les six entrées sont réparties en trois groupes, ce que la maquette marque
 * par deux filets : ce qu'on consulte, ce qu'on gère, ce qu'on configure.
 * `Réglages` quitte donc le pied de barre où il était relégué à côté de la
 * déconnexion, deux gestes qui n'ont rien à voir l'un avec l'autre.
 */

const consultation: SidebarEntry[] = [
    { label: "Dashboard", to: "/admin",         icon: DashboardSquare02Icon, exact: true },
    { label: "Tableaux",  to: "/admin/draws",   icon: LayoutTable02Icon },
    { label: "Matchs",    to: "/admin/matches", icon: File01Icon },
]

const gestion: SidebarEntry[] = [
    { label: "Joueurs", to: "/admin/players", icon: UserGroupIcon },
    { label: "Email",   to: "/admin/email",   icon: Mail01Icon },
]

const configuration: SidebarEntry[] = [
    { label: "Réglages", to: "/admin/settings", icon: Settings01Icon },
]

export function AdminSideBar() {
    const { pathname } = useLocation()
    const { signOut } = useAuth()

    return (
        <nav aria-label="Navigation principale" className="flex h-full w-full flex-col text-sm">
            <SidebarGroup entries={consultation} pathname={pathname} />
            <SidebarSeparator />
            <SidebarGroup entries={gestion} pathname={pathname} />
            <SidebarSeparator />
            <SidebarGroup entries={configuration} pathname={pathname} />
            <SidebarSignOut onSignOut={signOut} />
        </nav>
    )
}

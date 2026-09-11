import { useLocation } from "react-router"
import { Home01Icon, LayoutTable02Icon, Building04Icon } from "hugeicons-react"
import { useAuth } from "@/contexts/AuthContext"
import { SidebarGroup, SidebarSignOut, type SidebarEntry } from "@/components/shared/SidebarNav"

/**
 * Barre latérale du joueur. Même grammaire que celle de l'administration, en
 * plus court : trois entrées ne demandent pas de groupes.
 */

const entries: SidebarEntry[] = [
    { label: "Accueil",   to: "/user",          icon: Home01Icon, exact: true },
    { label: "Tableaux",  to: "/user/draws",    icon: LayoutTable02Icon },
    { label: "Découvrir", to: "/user/discover", icon: Building04Icon },
]

export function UserSideBar() {
    const { pathname } = useLocation()
    const { signOut } = useAuth()

    return (
        <nav aria-label="Navigation principale" className="flex h-full w-full flex-col text-sm">
            <SidebarGroup entries={entries} pathname={pathname} />
            <SidebarSignOut onSignOut={signOut} />
        </nav>
    )
}

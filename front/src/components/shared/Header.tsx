import { Link, useLocation } from "react-router"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { useHeaderActionsRegister, useHeaderHasActions } from "@/contexts/HeaderSlotContext"
import { AppBreadcrumb } from "@/components/shared/AppBreadcrumb"
import { EventInviteLink } from "@/components/admin/settings/EventInviteLink"
import { useEvent } from "@/contexts/EventContext"
import { useInviteLink } from "@/hooks/useInviteLink"
import { Notification03Icon, Moon02Icon, Sun03Icon, Search01Icon } from "hugeicons-react"

/**
 * Barre du haut, pleine largeur, posée au-dessus de toute la coque.
 *
 * Changement de principe par rapport à la version précédente : le header
 * reprenait la grille de 24 colonnes de `DashboardLayout` et réservait sa
 * première colonne à un carré gris, uniquement pour rester aligné sur la barre
 * latérale. Il ne partage plus rien avec elle, et n'a donc plus rien à aligner.
 *
 * Il ne porte que ce qui vaut pour toute l'application : la marque, le fil
 * d'Ariane qui situe club, événement et série, la recherche, le thème, les
 * notifications, le compte. Le titre de la page, lui, est descendu en tête de
 * la colonne de contenu, où `DashboardLayout` l'accueille.
 *
 * Le slot des actions de page reste ici, juste avant le bloc global : c'est la
 * place qu'il occupe sur la maquette, et les pages n'ont rien à changer.
 *
 * Trois zones, et **aucun espacement au niveau du header lui-même** : la marque
 * tient exactement la colonne de la barre latérale, le fil démarre sur la
 * verticale du titre de page, et le bloc de droite porte son propre
 * espacement. Un `gap` posé ici décalerait le fil de sa largeur et
 * l'alignement serait perdu.
 */
export default function Header() {
    const { profile, isAuthenticated } = useAuth()
    const { pathname } = useLocation()
    const registerActionsSlot = useHeaderActionsRegister()
    const hasActions = useHeaderHasActions()
    const { currentEvent } = useEvent()
    const { getInviteUrl } = useInviteLink()
    const [darkMode, setDarkMode] = useState(false)

    const dansLApplication = pathname.startsWith("/admin") || pathname.startsWith("/user")

    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode)
    }, [darkMode])

    return (
        <header className="flex h-12 shrink-0 items-center border-b border-border bg-card pr-8">

            {/*
              * Bloc de marque, calé sur la colonne de la barre latérale : les
              * deux emplacements font ensemble la largeur d'une entrée de menu.
              * `DashboardLayout` pose la même largeur sur son `aside`, les deux
              * doivent rester d'accord.
              */}
            <Link
                to="/"
                aria-label="Racket Fest"
                className="flex w-[207px] shrink-0 items-center gap-2.5 pl-8 pr-2.5"
            >
                <span
                    data-testid="logo-icon-placeholder"
                    className="size-8 shrink-0 rounded-lg bg-muted"
                />
                <span
                    data-testid="logo-name-placeholder"
                    className="h-4 flex-1 rounded bg-muted"
                />
            </Link>

            {/*
              * Le retrait est celui de la colonne de contenu : le fil démarre
              * donc sur la même verticale que le titre de la page.
              */}
            <div className="flex min-w-0 flex-1 items-center pl-8">
                {dansLApplication && isAuthenticated && <AppBreadcrumb />}
            </div>

            <div className="flex shrink-0 items-center gap-2">

                {/* Ce que la page en cours dépose : export, intégration, ajout… */}
                <div
                    ref={registerActionsSlot}
                    data-testid="header-actions"
                    className="flex items-center gap-1.5"
                />
                {hasActions && <div className="h-5 w-px shrink-0 bg-border" />}

                {/*
                  * Le lien d'invitation appartient à l'événement affiché, pas au
                  * club : il suit donc le fil d'Ariane. Absent si l'événement n'a
                  * pas de jeton, ce qui est le cas d'un club fermé aux visiteurs.
                  */}
                {isAuthenticated && currentEvent?.invite_token && (
                    <EventInviteLink
                        iconOnly
                        inviteUrl={getInviteUrl(currentEvent.invite_token)}
                        eventName={currentEvent.event_name}
                    />
                )}

                {isAuthenticated && (
                    /*
                     * La recherche est en place mais encore inerte : il n'y a pas
                     * d'index global à interroger. Aucun raccourci n'est capté non
                     * plus, `Ctrl+F` appartient au navigateur tant que ce champ ne
                     * fait rien.
                     */
                    <div className="relative shrink-0">
                        <Search01Icon
                            size={15}
                            strokeWidth={2}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="search"
                            aria-label="Rechercher un joueur, un match"
                            placeholder="Rechercher un joueur, un match..."
                            className="h-8 w-84 rounded-full border border-border bg-accent pl-9 pr-16 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
                        />
                        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Ctrl F
                        </kbd>
                    </div>
                )}

                <Button
                    variant="icon"
                    size="iconSm"
                    className="border"
                    aria-label={darkMode ? "Thème clair" : "Thème sombre"}
                    onClick={() => setDarkMode(!darkMode)}
                >
                    {darkMode ? <Sun03Icon size={16} strokeWidth={2} /> : <Moon02Icon size={16} strokeWidth={2} />}
                </Button>

                {isAuthenticated && profile ? (
                    <>
                        <Button variant="icon" size="iconSm" aria-label="Notifications" className="relative border">
                            <Notification03Icon size={16} strokeWidth={2} />
                            <span className="absolute right-1 top-1 size-1.5 rounded-full border border-card bg-rose-500" />
                        </Button>
                        <Link
                            to={profile.role === "user" ? "/user/profile" : "/admin/profile"}
                            className="flex shrink-0 items-center gap-2 rounded-full"
                        >
                            <Avatar className="size-8">
                                <AvatarImage
                                    src={profile.avatar_url || undefined}
                                    alt={`${profile.first_name} ${profile.last_name}`}
                                />
                                {/* Sans repli, un avatar absent laissait un trou dans la barre. */}
                                <AvatarFallback className="bg-primary/30 text-[11px] font-semibold">
                                    {`${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="sr-only">{`${profile.first_name} ${profile.last_name}`}</span>
                        </Link>
                    </>
                ) : (
                    <Button asChild variant="default" size="sm">
                        <Link to="/auth">Commencer</Link>
                    </Button>
                )}
            </div>
        </header>
    )
}

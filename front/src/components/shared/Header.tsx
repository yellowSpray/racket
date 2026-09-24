import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router"
import { Button } from "@/components/ui/button"
import { AvatarDuCompte, MenuDuCompte } from "@/components/shared/MenuDuCompte"
import { useAuth } from "@/contexts/AuthContext"
import { useHeaderActionsRegister, useHeaderHasActions } from "@/contexts/HeaderSlotContext"
import { AppBreadcrumb } from "@/components/shared/AppBreadcrumb"
import { EventInviteLink } from "@/components/admin/settings/EventInviteLink"
import { useEvent } from "@/contexts/EventContext"
import { useInviteLink } from "@/hooks/useInviteLink"
import { Notification03Icon, Search01Icon } from "hugeicons-react"
import { GOUTTIERE, RAIL, RAIL_PADDING } from "@/layout/rail"

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
    const { profile, isAuthenticated, signOut } = useAuth()
    const { pathname } = useLocation()
    const registerActionsSlot = useHeaderActionsRegister()
    const hasActions = useHeaderHasActions()
    const { currentEvent } = useEvent()
    const { getInviteUrl } = useInviteLink()

    const dansLApplication = pathname.startsWith("/admin") || pathname.startsWith("/user")

    /*
     * La recherche repliee. L'ouverture doit poser le foyer dans le champ, sans
     * quoi il faudrait deux clics pour ecrire, et c'est le foyer qui la referme.
     */
    const [rechercheOuverte, setRechercheOuverte] = useState(false)
    const champRecherche = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (rechercheOuverte) champRecherche.current?.focus()
    }, [rechercheOuverte])

    return (
        <>
        <header className="flex h-12 shrink-0 items-center border-b border-border bg-card pr-4 sm:pr-8">

            {/*
              * Bloc de marque, calé sur la colonne de la barre latérale : les
              * deux emplacements font ensemble la largeur d'une entrée de menu.
              * `DashboardLayout` pose la même largeur sur son `aside`, les deux
              * doivent rester d'accord.
              */}
            <Link
                to="/"
                aria-label="Racket Fest"
                className={`flex shrink-0 items-center justify-center gap-2.5 lg:justify-start ${RAIL} ${RAIL_PADDING}`}
            >
                <span
                    data-testid="logo-icon-placeholder"
                    className="size-8 shrink-0 rounded-lg bg-muted"
                />
                {/* Repliee, la colonne n'a la place que du pictogramme. */}
                <span
                    data-testid="logo-name-placeholder"
                    className="hidden h-4 flex-1 rounded bg-muted lg:block"
                />
            </Link>

            {/*
              * Le retrait est celui de la colonne de contenu : le fil démarre
              * donc sur la même verticale que le titre de la page.
              */}
            {/*
              * Sous 640 px le fil descend dans sa propre barre : il lui faut
              * 336 px pour ses trois segments, et il n'en a que 129 ici une
              * fois la marque et les quatre pastilles servies.
              */}
            <div className="hidden min-w-0 flex-1 items-center pl-8 sm:flex">
                {dansLApplication && isAuthenticated && <AppBreadcrumb />}
            </div>
            <div className="flex-1 sm:hidden" />

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
                     *
                     * ELLE SE RETRACTE EN QUATRE TEMPS, parce qu'elle est de loin
                     * le plus gros objet du header : 336 px, davantage que le fil
                     * d'Ariane, les notifications et l'avatar reunis. La laisser
                     * fixe, c'est lui faire manger le fil des que l'ecran serre.
                     *
                     *   2xl et plus   336 px, avec le rappel du raccourci
                     *   xl            256 px, le rappel part le premier
                     *   lg            192 px, l'invite se laisse rogner
                     *   sous lg       un bouton rond de 32, comme ses voisins
                     *
                     * Le raccourci s'en va avant la largeur : il occupe 44 px de
                     * retrait interieur, donc le garder sur un champ court le
                     * viderait de sa place utile.
                     */
                    <>
                        <div data-recherche className="relative hidden shrink-0 lg:block">
                            <Search01Icon
                                size={15}
                                strokeWidth={2}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            {/*
                              * L'invite s'allonge par morceaux au lieu d'etre
                              * coupee net. Un `placeholder` ne peut pas changer
                              * de texte selon la largeur, c'est un attribut, pas
                              * du style : on garde donc un espace comme invite
                              * reelle, ce qui laisse `:placeholder-shown` vrai
                              * tant que le champ est vide, et on pose par-dessus
                              * un texte qui, lui, obeit aux paliers.
                              */}
                            <input
                                type="search"
                                aria-label="Rechercher un joueur, un match"
                                placeholder=" "
                                className="peer h-8 w-48 rounded-full border border-border bg-accent pl-9 pr-3 text-sm focus-visible:border-ring focus-visible:outline-none xl:w-64 2xl:w-84 2xl:pr-16"
                            />
                            <span
                                data-invite-recherche
                                aria-hidden
                                className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 truncate text-sm text-muted-foreground peer-[:not(:placeholder-shown)]:hidden"
                            >
                                Rechercher
                                <span className="hidden xl:inline"> un joueur</span>
                                <span className="hidden 2xl:inline">, un match...</span>
                            </span>
                            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground 2xl:block">
                                Ctrl F
                            </kbd>
                        </div>

                        {/*
                          * Sous 1024, le champ devient le bouton lui-meme,
                          * retracte a 32 px. Ce n'est pas un second controle :
                          * c'est le meme, plie. Au clic il s'ouvre vers la
                          * gauche, par-dessus le fil d'Ariane, et se replie des
                          * qu'il perd le foyer ou qu'on appuie sur Echap.
                          *
                          * Il s'ouvre en absolu, donc sans pousser ses voisins,
                          * et un gabarit de 32 px garde sa place dans la rangee.
                          *
                          * LES 198 PX RETRANCHES, mesures sur la rangee : 54 du
                          * rail, 32 de gouttiere apres lui, 32 de gouttiere a
                          * droite du header, et 80 pour les deux pastilles qui
                          * suivent le champ, notifications et avatar, avec leurs
                          * deux ecarts. Le champ s'arrete donc sur la verticale
                          * du contenu et juste avant la cloche : il couvre le fil
                          * d'Ariane, rien d'autre.
                          */}
                        <div className="relative shrink-0 lg:hidden">
                            <div className="size-8" aria-hidden />
                            <div
                                data-recherche-repliee
                                data-ouverte={rechercheOuverte || undefined}
                                className={`absolute right-0 top-0 z-20 h-8 rounded-full border border-border bg-card transition-[width,background-color] duration-200 ${
                                    rechercheOuverte ? "w-[calc(100vw-198px)] bg-accent" : "w-8"
                                }`}
                            >
                                <button
                                    type="button"
                                    aria-label="Rechercher un joueur, un match"
                                    aria-expanded={rechercheOuverte}
                                    onClick={() => setRechercheOuverte(true)}
                                    className={`absolute left-0 top-0 grid size-8 place-items-center rounded-full text-foreground ${
                                        rechercheOuverte ? "pointer-events-none text-muted-foreground" : ""
                                    }`}
                                >
                                    <Search01Icon size={16} strokeWidth={2} />
                                </button>
                                <input
                                    ref={champRecherche}
                                    type="search"
                                    aria-label="Rechercher un joueur, un match"
                                    placeholder="Rechercher un joueur, un match..."
                                    onBlur={() => setRechercheOuverte(false)}
                                    /* `blur` et non l'etat : sinon le foyer reste
                                       dans un champ devenu invisible. */
                                    onKeyDown={e => { if (e.key === "Escape") e.currentTarget.blur() }}
                                    className={`h-8 w-full rounded-full bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none ${
                                        rechercheOuverte ? "" : "pointer-events-none opacity-0"
                                    }`}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/*
                  * Le bouton de thème a été retiré le 12 septembre, le temps du
                  * chantier des tokens. Il basculait une classe `dark` à
                  * laquelle rien ne répondait : promettre un thème sombre qui
                  * n'arrive pas est pire que ne rien proposer. Il revient
                  * quand le bloc `.dark` existe.
                  */}
                {isAuthenticated && profile ? (
                    <>
                        <Button variant="icon" size="iconSm" aria-label="Notifications" className="relative border">
                            <Notification03Icon size={16} strokeWidth={2} />
                            {/* Le rouge plein du systeme, celui de l'alerte. */}
                            <span className="absolute right-1 top-1 size-1.5 rounded-full border border-card bg-destructive" />
                        </Button>
                        {/*
                          * Deux avatars pour deux largeurs. Au-dessus de 640 un
                          * lien vers le profil, la barre laterale portant deja
                          * Reglages et Quitter. En dessous un menu, parce que
                          * les onglets n'en tiennent que cinq et que ces deux
                          * gestes n'avaient plus d'autre maison.
                          */}
                        <Link
                            to={profile.role === "user" ? "/user/profile" : "/admin/profile"}
                            className="hidden shrink-0 items-center gap-2 rounded-full sm:flex"
                        >
                            <AvatarDuCompte profile={profile} />
                            <span className="sr-only">{`${profile.first_name} ${profile.last_name}`}</span>
                        </Link>
                        <div data-compte-telephone className="flex sm:hidden">
                            <MenuDuCompte profile={profile} onSignOut={signOut} />
                        </div>
                    </>
                ) : (
                    <Button asChild variant="default" size="sm">
                        <Link to="/auth">Commencer</Link>
                    </Button>
                )}
            </div>
        </header>

        {/*
          * LA SECONDE BARRE, sur telephone seulement. Le fil d'Ariane n'est pas
          * un ornement : ses deux selecteurs sont le seul moyen de changer
          * d'evenement et de serie. Le comprimer a 129 px le reduisait a trois
          * pictogrammes, donc a rien. Il prend une barre a lui, calquee sur la
          * premiere, filet compris.
          */}
        {dansLApplication && isAuthenticated && (
            <div
                data-second-header
                className={`flex h-11 shrink-0 items-center border-b border-border bg-card sm:hidden ${GOUTTIERE}`}
            >
                <AppBreadcrumb pleineLargeur />
            </div>
        )}
        </>
    )
}

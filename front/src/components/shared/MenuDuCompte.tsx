import { Link } from "react-router"
import { Logout03Icon, Settings01Icon, UserIcon } from "hugeicons-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProfilDuCompte {
    role: string
    first_name: string | null
    last_name: string | null
    avatar_url?: string | null
}

const ENTREE = "h-10 focus:bg-muted focus:text-foreground"

/** L'avatar du header, avec son repli sur les initiales. */
export function AvatarDuCompte({ profile }: { profile: ProfilDuCompte }) {
    return (
        <Avatar className="size-8">
            <AvatarImage
                src={profile.avatar_url || undefined}
                alt={`${profile.first_name} ${profile.last_name}`}
            />
            {/* Sans repli, un avatar absent laissait un trou dans la barre. */}
            <AvatarFallback className="bg-primary/30 text-[11px] leading-none font-semibold">
                {`${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()}
            </AvatarFallback>
        </Avatar>
    )
}

/**
 * L'avatar du telephone : un menu, et non plus un lien.
 *
 * Sous 640 px la barre laterale descend en onglets, et les onglets n'en
 * tiennent que cinq. `Réglages` et `Quitter` n'avaient donc plus de maison :
 * un admin sur telephone ne pouvait ni ouvrir ses reglages ni se deconnecter.
 * Ils descendent ici, derriere l'avatar, avec le profil que l'avatar ouvrait
 * deja.
 *
 * Au-dessus de 640 rien ne change, l'avatar reste un lien vers le profil : la
 * barre laterale porte deja les deux gestes, un menu les aurait doubles.
 *
 * Le menu ne dit pas plus que la barre qu'il remplace : le joueur n'a pas de
 * reglages dans la sienne, il n'en a pas ici.
 */
export function MenuDuCompte({
    profile, onSignOut,
}: {
    profile: ProfilDuCompte
    onSignOut: () => void
}) {
    const racine = profile.role === "user" ? "/user" : "/admin"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label="Menu du compte"
                className="grid size-8 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <AvatarDuCompte profile={profile} />
            </DropdownMenuTrigger>

            {/*
              * Cale sur le bord droit de l'avatar, lui-meme sur la gouttiere :
              * le menu ne deborde pas de la fenetre et s'aligne sur le contenu.
              */}
            <DropdownMenuContent align="end" sideOffset={8} className="w-52">
                <DropdownMenuLabel className="truncate font-semibold">
                    {`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/*
                  * 40 px par entree et non les 32 du menu par defaut : on les
                  * vise au doigt, pas au curseur. Et `bg-muted` au foyer, le
                  * `bg-accent` du menu etant un blanc pose sur un blanc : la
                  * barre laterale dit son survol avec ce meme gris.
                  */}
                <DropdownMenuItem asChild className={ENTREE}>
                    <Link to={`${racine}/profile`}>
                        <UserIcon size={16} strokeWidth={2} />
                        Mon profil
                    </Link>
                </DropdownMenuItem>
                {profile.role !== "user" && (
                    <DropdownMenuItem asChild className={ENTREE}>
                        <Link to={`${racine}/settings`}>
                            <Settings01Icon size={16} strokeWidth={2} />
                            Réglages
                        </Link>
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onSignOut} className="h-10">
                    <Logout03Icon size={16} strokeWidth={2} />
                    Quitter
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

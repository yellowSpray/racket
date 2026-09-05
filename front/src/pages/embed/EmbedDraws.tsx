import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import { useEmbedDraws } from "@/hooks/useEmbedDraws"
import { DrawTable } from "@/components/admin/draws/DrawTable"
import { sortGroupsByName } from "@/lib/utils"
import { publishEmbedHeight } from "@/lib/embedHeight"

/**
 * Tableaux d'une serie, affiches dans un cadre sur le site d'un club.
 *
 * Page publique : aucune connexion, aucune barre laterale, aucun en-tete
 * d'application. Tout vient d'un seul appel `get_draws_by_embed_token`, le
 * jeton de l'URL faisant office de cle.
 *
 * La navigation entre series vit dans le cadre : un seul iframe remplace une
 * page par serie. Le parametre `?serie=N` fige l'affichage sur une serie et
 * masque la navigation, pour un club qui prefere garder une page par serie.
 *
 * Le tableau est le meme composant que dans l'application, volontairement :
 * un second tableau dedie a l'embed finirait par diverger de celui que les
 * organisateurs voient.
 */
export function EmbedDraws() {
    const { token } = useParams<{ token: string }>()
    const [searchParams] = useSearchParams()

    const pinned = useMemo(() => {
        const raw = Number(searchParams.get("serie"))
        return Number.isInteger(raw) && raw > 0 ? raw : null
    }, [searchParams])

    // Serie choisie dans le cadre. Le pin de l'URL a toujours le dernier mot.
    const [chosen, setChosen] = useState<number | null>(null)
    const { draws, loading, error } = useEmbedDraws(token, pinned ?? chosen)

    const groups = useMemo(
        () => (draws ? sortGroupsByName(draws.groups) : []),
        [draws],
    )

    const shell = useRef<HTMLDivElement>(null)

    /*
     * La page hote ne peut pas deviner la hauteur d'un cadre. On la mesure
     * apres chaque rendu, et a chaque changement de taille du contenu, puis on
     * l'annonce. useLayoutEffect plutot que useEffect : la mesure doit avoir
     * lieu avant que le navigateur peigne, sinon la premiere valeur envoyee
     * est celle d'un contenu encore vide.
     */
    useLayoutEffect(() => {
        const node = shell.current
        if (!node) return

        publishEmbedHeight(node.getBoundingClientRect().height)

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                publishEmbedHeight(entry.contentRect.height)
            }
        })
        observer.observe(node)
        return () => observer.disconnect()
    }, [draws, loading, error])

    // Les polices arrivent apres le premier rendu et changent la hauteur.
    useEffect(() => {
        const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
        fonts?.ready.then(() => {
            if (shell.current) publishEmbedHeight(shell.current.getBoundingClientRect().height)
        })
    }, [])

    const majDate = useMemo(() => {
        if (!draws?.round.updated_at) return null
        return new Date(draws.round.updated_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
    }, [draws])

    if (loading) {
        return (
            <div ref={shell} className="bg-white p-6 text-sm text-muted-foreground">
                Chargement des tableaux...
            </div>
        )
    }

    if (error || !draws) {
        return (
            <div ref={shell} className="bg-white p-6 text-sm text-muted-foreground">
                {error ?? "Tableaux indisponibles"}
            </div>
        )
    }

    const current = draws.round.round_number
    const showNav = !pinned && draws.series.length > 1

    return (
        <div ref={shell} className="bg-white p-4 sm:p-6 flex flex-col gap-4">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {draws.logo_url && (
                    <img
                        src={draws.logo_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                    />
                )}
                <div className="flex flex-col min-w-0">
                    <h1 className="text-base font-semibold leading-tight truncate">
                        {draws.event_name}
                        <span className="text-muted-foreground font-normal">
                            {" "}· Série {current}
                        </span>
                    </h1>
                    <p className="text-xs text-muted-foreground truncate">{draws.club_name}</p>
                </div>
                {majDate && (
                    <span className="ml-auto shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                        Mis à jour le {majDate}
                    </span>
                )}
            </header>

            {showNav && (
                <nav aria-label="Séries" className="flex flex-wrap items-center gap-1.5">
                    {draws.series.map(s => {
                        const active = s.round_number === current
                        return (
                            <button
                                key={s.round_number}
                                type="button"
                                aria-current={active ? "page" : undefined}
                                onClick={() => setChosen(s.round_number)}
                                className={`min-w-9 rounded-md px-2.5 py-1 text-sm transition-colors ${
                                    active
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                }`}
                            >
                                {s.round_number}
                            </button>
                        )
                    })}
                </nav>
            )}

            {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Les tableaux de cette série ne sont pas encore publiés.
                </p>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                    {groups.map(group => (
                        <DrawTable
                            key={group.id}
                            group={group}
                            matches={draws.matches.filter(m => m.group_id === group.id)}
                            displayMode="score"
                        />
                    ))}
                </div>
            )}

            <p className="text-[11px] text-muted-foreground/70">
                Tableaux publiés avec Event Fest
            </p>
        </div>
    )
}

export default EmbedDraws

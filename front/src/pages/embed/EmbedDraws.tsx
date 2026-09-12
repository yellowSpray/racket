import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import { useEmbedDraws } from "@/hooks/useEmbedDraws"
import { DrawTable } from "@/components/admin/draws/DrawTable"
import { sortGroupsByName } from "@/lib/utils"
import { sortPlayersByEarliestDates } from "@/lib/matchScheduler"
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
     * `#root` est fige a 100vh pour la coquille applicative. La page integree
     * doit au contraire grandir avec son contenu, sinon elle defile dans
     * l'iframe qui defile deja. Le marqueur pose ici active la regle
     * `html[data-embed] #root` de index.css.
     */
    useLayoutEffect(() => {
        document.documentElement.dataset.embed = "true"
        return () => { delete document.documentElement.dataset.embed }
    }, [])

    /*
     * La page hote ne peut pas deviner la hauteur d'un cadre. On la mesure
     * apres chaque rendu, et a chaque changement de taille du contenu, puis on
     * l'annonce. useLayoutEffect plutot que useEffect : la mesure doit avoir
     * lieu avant que le navigateur peigne, sinon la premiere valeur envoyee
     * est celle d'un contenu encore vide.
     *
     * L'observateur sert de declencheur, pas de source : son `contentRect`
     * decrit la boite de contenu et ignore les marges interieures. Annoncer
     * cette valeur laissait le cadre trop court de ces marges, d'ou une
     * petite barre de defilement residuelle. On remesure donc le noeud.
     */
    useLayoutEffect(() => {
        const node = shell.current
        if (!node) return

        const annoncer = () => publishEmbedHeight(node.getBoundingClientRect().height)

        annoncer()

        const observer = new ResizeObserver(annoncer)
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

    /*
     * Le bareme decide de la colonne Total. Il vient de la fonction SQL, qui
     * resout l'evenement puis le club : cette page ne peut pas lire
     * `event_scoring_rules` ni `scoring_rules`, elles sont derriere la RLS et
     * son visiteur est anonyme.
     *
     * `undefined` quand la base n'en porte aucun : `DrawTable` applique alors
     * son propre defaut, le meme que dans l'application. Les deux pages
     * affichent donc les memes totaux dans tous les cas.
     */
    const bareme = useMemo(
        () => (draws?.score_points ? { score_points: draws.score_points } : undefined),
        [draws],
    )

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
        <div ref={shell} data-embed-shell className="bg-white p-3 sm:p-6 flex flex-col gap-4">
            {/*
              * Cet en-tete remplace celui du site hote : c'est lui qui porte
              * l'identite du club. Il se lit donc comme une carte de titre,
              * en colonne centree, logo d'abord.
              */}
            <header className="flex flex-col items-center gap-1.5 text-center">
                {/* object-contain et non cover : un logo de club est souvent
                    large, le recadrer en rond le tronquait. */}
                {draws.logo_url && (
                    <img
                        src={draws.logo_url}
                        alt=""
                        className="mb-1 h-14 w-auto max-w-40 object-contain"
                    />
                )}
                <h1 className="text-base font-semibold leading-tight text-balance">
                    {draws.event_name}
                    <span className="text-muted-foreground font-normal">
                        {" "}· Série {current}
                    </span>
                </h1>
                <p className="text-xs text-muted-foreground">{draws.club_name}</p>
                {majDate && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                        Mis à jour le {majDate}
                    </span>
                )}
            </header>

            {showNav && (
                <nav aria-label="Séries" className="flex flex-wrap items-center justify-center gap-1.5">
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
                /*
                 * Les memes paliers que l'ecran des tableaux, et pour la meme
                 * raison : un tableau de box a une taille juste, 532 px, et
                 * au-dela il en faut plus, pas des plus gros. Les deux pages
                 * rendent le meme composant, elles doivent le poser pareil,
                 * sans quoi comparer les deux fait croire a un defaut.
                 *
                 * La gouttiere reste a 16 et non 24 : le cadre est enchasse
                 * dans le site d'un club, il n'a pas les marges d'une page.
                 *
                 * `justify-center` et non `justify-start` comme l'ecran admin :
                 * ici tout est centre, le logo du club, le titre de la serie, la
                 * navigation entre series. Des tableaux colles a gauche sous un
                 * en-tete centre se lisent comme un defaut d'alignement.
                 */
                <div className="grid justify-center gap-4 [grid-template-columns:repeat(1,minmax(0,532px))] lg:[grid-template-columns:repeat(2,minmax(0,532px))] 2xl:[grid-template-columns:repeat(3,minmax(0,532px))] min-[2560px]:[grid-template-columns:repeat(4,minmax(0,532px))] min-[3440px]:[grid-template-columns:repeat(5,minmax(0,532px))]">
                    {groups.map(group => {
                        const groupMatches = draws.matches.filter(m => m.group_id === group.id)
                        /*
                         * Meme tri que la page des tableaux : les lettres A a F
                         * suivent les premieres dates de match, pas l'ordre
                         * alphabetique. Sans cela, un joueur n'occupe pas la
                         * meme ligne ici et dans l'application.
                         */
                        const sorted = sortPlayersByEarliestDates(group, groupMatches)
                        return (
                            <DrawTable
                                key={group.id}
                                group={sorted}
                                matches={groupMatches}
                                scoringRules={bareme}
                                displayMode="score"
                            />
                        )
                    })}
                </div>
            )}

            {/*
              * Centre comme tout le reste du cadre, et sans l'opacite de 70 %
              * qui le mettait a 2.96 pour 1 sur le blanc. Une mention de pied
              * reste du texte : le seuil de 4.5 vaut pour elle aussi.
              */}
            <p className="text-center text-[11px] text-muted-foreground">
                Tableaux publiés avec Racket Fest
            </p>
        </div>
    )
}

export default EmbedDraws

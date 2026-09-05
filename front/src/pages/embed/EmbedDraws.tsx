import { useMemo } from "react"
import { useParams, useSearchParams } from "react-router"
import { useEmbedDraws } from "@/hooks/useEmbedDraws"
import { DrawTable } from "@/components/admin/draws/DrawTable"
import { sortGroupsByName } from "@/lib/utils"

/**
 * Tableaux d'une serie, affiches dans un cadre sur le site d'un club.
 *
 * Page publique : aucune connexion, aucune barre laterale, aucun en-tete
 * d'application. Tout vient d'un seul appel `get_draws_by_embed_token`, le
 * jeton de l'URL faisant office de cle.
 *
 * Le tableau est le meme composant que dans l'application, volontairement :
 * un second tableau dedie a l'embed finirait par diverger de celui que les
 * organisateurs voient.
 */
export function EmbedDraws() {
    const { token } = useParams<{ token: string }>()
    const [searchParams] = useSearchParams()

    // « ?serie=3 » epingle une serie ; sinon la page suit la serie active.
    const roundNumber = useMemo(() => {
        const raw = Number(searchParams.get("serie"))
        return Number.isInteger(raw) && raw > 0 ? raw : null
    }, [searchParams])

    const { draws, loading, error } = useEmbedDraws(token, roundNumber)

    const groups = useMemo(
        () => (draws ? sortGroupsByName(draws.groups) : []),
        [draws],
    )

    if (loading) {
        return (
            <div className="p-6 text-sm text-muted-foreground">
                Chargement des tableaux...
            </div>
        )
    }

    if (error || !draws) {
        return (
            <div className="p-6 text-sm text-muted-foreground">
                {error ?? "Tableaux indisponibles"}
            </div>
        )
    }

    return (
        <div className="bg-white p-4 sm:p-6 flex flex-col gap-5">
            <header className="flex items-center gap-3">
                {draws.logo_url && (
                    <img
                        src={draws.logo_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover shrink-0"
                    />
                )}
                <div className="flex flex-col">
                    <h1 className="text-base font-semibold leading-tight">
                        {draws.event_name}
                        <span className="text-muted-foreground font-normal">
                            {" "}· Série {draws.round.round_number}
                        </span>
                    </h1>
                    <p className="text-xs text-muted-foreground">{draws.club_name}</p>
                </div>
            </header>

            {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Les tableaux de cette série ne sont pas encore publiés.
                </p>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
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

import { useMemo, useRef, useState } from "react"
import { Navigate } from "react-router"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useHeaderSlot } from "@/contexts/HeaderSlotContext"
import { PlayersStatusCard } from "@/components/admin/dashboard/PlayersStatusCard"
import { UnpaidPaymentsCard } from "@/components/admin/dashboard/UnpaidPaymentsCard"
import { MatchesCard } from "@/components/admin/dashboard/MatchesCard"

/** L'ordre des cartes, et le nom que porte chaque pastille du carrousel. */
const CARTES = ["Matchs", "Arrivées", "Paiements"] as const

export function AdminDashboard() {
    const { profile } = useAuth()
    const { currentEvent, currentRound, events, loading: eventsLoading } = useEvent()

    /** Série qui précède la série en cours dans le même événement. */
    const previousRoundId = useMemo(() => {
        if (!currentRound) return null
        const previous = (currentEvent?.event_rounds ?? [])
            .filter(r => r.round_number < currentRound.round_number)
            .sort((a, b) => b.round_number - a.round_number)[0]
        return previous?.id ?? null
    }, [currentEvent?.event_rounds, currentRound])

/*
     * Le carrousel du telephone. La position se lit sur le defilement plutot
     * que de se piloter : c'est le doigt qui commande, et un etat qui
     * pretendrait commander se desynchroniserait au premier balayage.
     */
    const piste = useRef<HTMLDivElement>(null)
    const [carteVisible, setCarteVisible] = useState(0)

    const suivreLaPosition = () => {
        const p = piste.current
        if (!p || p.clientWidth === 0) return
        setCarteVisible(Math.round(p.scrollLeft / p.clientWidth))
    }

    const allerA = (index: number) => {
        const p = piste.current
        if (!p) return
        p.scrollTo({ left: index * p.clientWidth, behavior: "smooth" })
    }

    /*
     * Le titre ne redit pas le nom du club : le fil d'Ariane l'affiche a
     * quelques pixels de la, dans son premier segment.
     *
     * Les pastilles du carrousel se posent a sa droite, sur la ligne de titre,
     * plutot que sous la piste. Elles y sont a hauteur de regard avant qu'on
     * ait touche l'ecran, alors qu'en pied de carte il fallait d'abord voir le
     * bas de la carte pour apprendre qu'il y en avait deux autres.
     */
    const headerPortal = useHeaderSlot(
        <>
            <h3 className="text-lg font-semibold">Dashboard</h3>
            <div data-carrousel-points className="flex items-center gap-2 lg:hidden">
                {CARTES.map((nom, i) => (
                    <button
                        key={nom}
                        type="button"
                        aria-label={nom}
                        aria-current={i === carteVisible ? "true" : undefined}
                        onClick={() => allerA(i)}
                        className={`h-2 rounded-full transition-all ${
                            i === carteVisible ? "w-6 bg-foreground" : "w-2 bg-border"
                        }`}
                    />
                ))}
            </div>
        </>
    )


    // Nouveau club sans event → onboarding guidé
    if (!eventsLoading && events.length === 0) {
        return <Navigate to="/admin/onboarding" replace />
    }

    return (
        <>
            {headerPortal}
            {/*
              * DEUX DISPOSITIONS POUR TROIS CARTES, ET UN SEUL ORDRE DANS LE
              * DOCUMENT.
              *
              * A partir de 1024, deux colonnes : les matchs a gauche sur toute
              * la hauteur, les arrivees et les paiements empiles a droite. Le
              * rail de droite est une largeur et non une fraction, ses cartes
              * portent des noms et des pastilles et ne gagnent rien a
              * s'elargir, alors que le tableau des matchs et ses cinq colonnes
              * prend tout ce qui reste. C'est `grid-rows-2` plus un
              * `row-span-2` sur les matchs qui le dit, ce qui evite le
              * sous-conteneur d'avant : les trois cartes sont trois soeurs, et
              * c'est ce qui rend le carrousel possible sans dupliquer le JSX.
              *
              * EN DESSOUS, UN CARROUSEL. Les 360 px du rail ne se negocient
              * pas : la grille reclamait 758 px de large a toutes les tailles,
              * donc la page debordait de 383 px sur un telephone de 375. Les
              * empiler reglait le debordement mais donnait une page de trois
              * ecrans de haut, ou l'on ne voit jamais deux cartes ensemble.
              * Une carte par ecran, qu'on fait defiler du pouce : c'est le
              * geste que la tuile des arrivees emploie deja pour ses
              * diapositives.
              *
              * `scroll-snap` et non une bibliotheque : le navigateur pose les
              * points d'arret, le clavier et la molette marchent sans une ligne
              * de code, et il n'y a rien a desactiver au-dessus de 1024.
              */}
            <div
                ref={piste}
                onScroll={suivreLaPosition}
                data-carrousel
                className="flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:snap-none lg:grid-cols-[1fr_360px] lg:grid-rows-2 lg:overflow-visible"
            >
                <MatchesCard
                    className="w-full shrink-0 snap-start lg:row-span-2 lg:w-auto lg:min-h-0"
                    roundId={currentRound?.id ?? null}
                />
                <PlayersStatusCard
                    className="w-full shrink-0 snap-start lg:w-auto lg:min-h-0"
                    roundId={currentRound?.id ?? null}
                    previousRoundId={previousRoundId}
                />
                <UnpaidPaymentsCard
                    className="w-full shrink-0 snap-start lg:w-auto lg:min-h-0"
                    clubId={profile?.club_id ?? null}
                />
            </div>

        </>
    )
}

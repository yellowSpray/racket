import { useEffect, type ReactNode } from "react"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { Home01Icon, Layers01Icon, ArrowRight01Icon } from "hugeicons-react"
import type { EventRound } from "@/types/event"

/**
 * Fil d'Ariane du header : club, événement, série.
 *
 * Il remplace `EventSelector`, qui vivait dans le slot gauche du header. Le
 * gain n'est pas que cosmétique : le sélecteur ne disait que l'événement, et
 * la série se déduisait toute seule sans qu'on puisse en changer. Ici les deux
 * derniers segments sont des menus, et le premier situe le club.
 *
 * Chaque menu est un `select` natif posé en transparence sur sa pastille. Trois
 * raisons : il se pilote au clavier sans une ligne de code, il se teste par un
 * simple `change`, et sur téléphone le système ouvre sa propre roulette, ce qui
 * fera une chose de moins à traiter au moment du responsive.
 */

function RoundStatusDot({ round }: { round: EventRound | null | undefined }) {
    if (!round) return null
    const couleur =
        round.status === "active"   ? "bg-green-500" :
        round.status === "upcoming" ? "bg-amber-400" :
                                      "bg-gray-400"
    return <span className={`size-2 shrink-0 rounded-full ${couleur}`} />
}

/*
 * Le séparateur est un pictogramme et non le caractère « > ». Un caractère suit
 * la fonte : sa graisse, sa taille et sa position sur la ligne de base
 * échappent au réglage, et il se posait un cheveu trop haut. Le chevron se cale
 * au centre de la ligne et garde le même trait que les chevrons de sélection.
 */
function Separateur() {
    return (
        <ArrowRight01Icon
            data-crumb-separator
            aria-hidden
            size={13}
            strokeWidth={2}
            className="mx-0.5 shrink-0 text-muted-foreground/60"
        />
    )
}

/*
 * La marque de sélection : deux chevrons empilés, dessinés ici plutôt que pris
 * dans la bibliothèque d'icônes.
 *
 * Deux raisons. Le chevron de hugeicons est large et plat, il fallait l'étirer
 * pour approcher la forme voulue. Et surtout, deux icônes rapprochées par des
 * marges négatives ne donnent pas un écart fiable : affiner le trait élargit
 * l'écart, les deux réglages se défont l'un l'autre. Un seul tracé règle la
 * question.
 *
 * Les cotes sont celles de la référence, à l'unité près, le `viewBox` étant à
 * l'échelle 1 : chaque chevron fait 6 px de large sur 4 de haut trait compris,
 * 2 px les séparent, le trait fait 1 px, les bouts sont arrondis.
 *
 * Un seul chevron vers le bas se lirait « déplier ». La paire dit « choisir
 * dans une liste », ce que ces segments font vraiment.
 */
function DoubleChevron() {
    return (
        <svg
            data-crumb-chevrons
            aria-hidden
            width="7"
            height="14"
            viewBox="0 0 7 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-muted-foreground"
        >
            <path d="M1 5 L3.5 2 L6 5" />
            <path d="M1 9 L3.5 12 L6 9" />
        </svg>
    )
}

function Segment({
    ariaLabel, value, options, onChange, children,
}: {
    ariaLabel: string
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
    children: ReactNode
}) {
    return (
        <span className="relative inline-flex min-w-0 items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted">
            {children}
            <DoubleChevron />
            <select
                aria-label={ariaLabel}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 w-full cursor-pointer opacity-0"
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </span>
    )
}

export function AppBreadcrumb() {
    const { profile } = useAuth()
    const { clubConfig, fetchClubConfig } = useClubConfig()
    const { currentEvent, currentRound, events, setCurrentEvent, setCurrentRound } = useEvent()

    const clubId = profile?.club_id ?? null
    useEffect(() => {
        if (clubId) fetchClubConfig(clubId)
    }, [clubId, fetchClubConfig])

    // De la plus récente à la plus ancienne : on travaille sur celle en cours.
    const rounds = [...(currentEvent?.event_rounds ?? [])]
        .sort((a, b) => b.round_number - a.round_number)

    return (
        <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 pr-1.5 py-0.5">
                <Home01Icon
                    data-crumb-icon="club"
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-muted-foreground"
                />
                <span className="truncate">{clubConfig?.club_name ?? "Mon club"}</span>
            </span>

            {currentEvent && (
                <>
                    <Separateur />
                    <Segment
                        ariaLabel="Événement"
                        value={currentEvent.id}
                        options={events.map(e => ({ value: e.id, label: e.event_name }))}
                        onChange={setCurrentEvent}
                    >
                        {/*
                          * Des couches empilées, pas une coupe : le fil est une
                          * hiérarchie de contenants, et un événement contient
                          * ses séries. Une coupe dirait le vainqueur, ce qui
                          * n'existe pas à ce niveau.
                          */}
                        <Layers01Icon
                            data-crumb-icon="evenement"
                            size={14}
                            strokeWidth={2}
                            className="shrink-0 text-muted-foreground"
                        />
                        <span className="max-w-40 truncate">{currentEvent.event_name}</span>
                    </Segment>
                </>
            )}

            {currentEvent && currentRound && (
                <>
                    <Separateur />
                    <Segment
                        ariaLabel="Série"
                        value={currentRound.id}
                        options={rounds.map(r => ({ value: r.id, label: `Série ${r.round_number}` }))}
                        onChange={setCurrentRound}
                    >
                        <RoundStatusDot round={currentRound} />
                        <span className="truncate">Série {currentRound.round_number}</span>
                    </Segment>
                </>
            )}
        </nav>
    )
}

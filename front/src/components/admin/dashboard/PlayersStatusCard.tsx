import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    UserGroupIcon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Clock01Icon,
} from "hugeicons-react"
import { usePlayerMovements, type PlayerMovement } from "@/hooks/usePlayerMovements"
import { formatRelativeTime } from "@/lib/formatRelativeTime"

/**
 * « Arrivées » et non « Inscrits » : la carte ne compte pas l'effectif de la
 * série, elle compte ceux qui n'étaient pas là à la série précédente.
 */
const SLIDES = ["Arrivées", "Désinscrits", "Liste d'attente"] as const

const ARRIVEES = 0
const DEPARTS = 1
const ATTENTE = 2

interface PlayersStatusCardProps {
    /** Série en cours : les mouvements se lisent d'une série à l'autre. */
    roundId: string | null
    /** Série qui précède, dans le même événement. */
    previousRoundId: string | null
    className?: string
}

export function PlayersStatusCard({ roundId, previousRoundId, className }: PlayersStatusCardProps) {
    const { movements, loading } = usePlayerMovements(roundId, previousRoundId)
    const [slideIndex, setSlideIndex] = useState(0)

    const visibles = movements.filter(m =>
        slideIndex === ARRIVEES ? m.status === "active"
            : slideIndex === DEPARTS ? m.status === "inactive"
                : false,
    )

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <UserGroupIcon size={16} className="text-foreground" />
                    {SLIDES[slideIndex]}
                    {visibles.length > 0 && (
                        // Vert et non le rouge des paiements : celui-ci renseigne,
                        // il n'alerte pas. Un disque qui s'allonge en pastille
                        // au-delà de deux chiffres.
                        <Badge variant="count" className="h-5 min-w-5 px-1.5 text-[11px] leading-none">
                            {visibles.length}
                        </Badge>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                            disabled={slideIndex === 0}
                            className="p-0.5 rounded transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Slide précédent"
                        >
                            <ArrowLeft01Icon size={14} />
                        </button>
                        <button
                            onClick={() => setSlideIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
                            disabled={slideIndex === SLIDES.length - 1}
                            className="p-0.5 rounded transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Slide suivant"
                        >
                            <ArrowRight01Icon size={14} />
                        </button>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 px-6 pt-1">
                {slideIndex === ATTENTE ? (
                    <ListeAttente />
                ) : (
                    <MovementsList
                        movements={visibles}
                        loading={loading}
                        emptyLabel={slideIndex === ARRIVEES ? "Aucune arrivée" : "Aucun désinscrit"}
                    />
                )}
            </CardContent>
        </Card>
    )
}

function MovementsList({ movements, loading, emptyLabel }: { movements: PlayerMovement[]; loading: boolean; emptyLabel: string }) {
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (movements.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <UserGroupIcon size={28} className="mb-3" />
                <p className="text-sm">{emptyLabel}</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full" type="auto">
            <ul>
                {movements.map((m, i) => (
                    <li
                        key={`${m.profileId}-${m.roundId}`}
                        data-ligne-mouvement
                        className={`flex h-8 items-center gap-2 rounded-md px-4 ${
                            i % 2 === 0 ? "bg-muted/40" : ""
                        }`}
                    >
                        <span className="min-w-0 flex-1 truncate text-sm">
                            {m.firstName} {m.lastName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {formatRelativeTime(m.registeredAt)}
                        </span>
                    </li>
                ))}
            </ul>
        </ScrollArea>
    )
}

function ListeAttente() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Clock01Icon size={28} className="mb-3" />
            <p className="text-sm text-center">Joueurs inscrits en attente d'un groupe</p>
            <p className="text-xs mt-1">À venir</p>
        </div>
    )
}

import { ChartIncreaseIcon, ChartDecreaseIcon, UserAdd01Icon, ArrowLeftRightIcon } from "hugeicons-react"
import { describeMovement, type MovementType, type PlayerMovement } from "@/lib/playerMovement"

interface PlayerMovementBadgeProps {
    movement: PlayerMovement
}

/** Icône et couleur associées à chaque type de mouvement. */
const STYLES: Record<MovementType, { className: string; icon: React.ReactNode }> = {
    promotion:  { className: "text-emerald-600", icon: <ChartIncreaseIcon className="h-3.5 w-3.5" /> },
    relegation: { className: "text-red-500",     icon: <ChartDecreaseIcon className="h-3.5 w-3.5" /> },
    stay:       { className: "text-gray-400",    icon: <span className="text-[10px] leading-none font-bold">=</span> },
    new:        { className: "text-blue-500",    icon: <UserAdd01Icon className="h-3.5 w-3.5" /> },
    returning:  { className: "text-amber-500",   icon: <UserAdd01Icon className="h-3.5 w-3.5" /> },
    adjusted:   { className: "text-amber-500",   icon: <ArrowLeftRightIcon className="h-3.5 w-3.5" /> },
}

/**
 * Repère visuel du parcours d'un joueur depuis la série précédente.
 *
 * L'explication complète (« 1er du Box 3 avec 24 pts → promu au Box 2 ») est portée par
 * `aria-label` et `title` : elle est donc lue par les lecteurs d'écran et visible au
 * survol, sans dépendre d'un composant d'infobulle dans une table déjà dense — et elle
 * survit à l'export PDF, qui rend le DOM tel quel.
 */
export function PlayerMovementBadge({ movement }: PlayerMovementBadgeProps) {
    const style = STYLES[movement.type]
    const description = describeMovement(movement)
    const crossedTiers = movement.tierDelta === null ? 0 : Math.abs(movement.tierDelta)

    return (
        <span
            data-testid={`movement-${movement.type}`}
            aria-label={description}
            title={description}
            className={`inline-flex items-center gap-0.5 shrink-0 cursor-help ${style.className}`}
        >
            {style.icon}
            {crossedTiers > 1 && (
                <span className="text-[10px] leading-none font-semibold">{crossedTiers}</span>
            )}
        </span>
    )
}

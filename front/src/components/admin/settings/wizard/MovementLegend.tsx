import { useMemo } from "react"
import { PlayerMovementBadge } from "@/components/admin/draws/PlayerMovementBadge"
import type { MovementType, PlayerMovement } from "@/lib/playerMovement"
import { movementLabel } from "@/lib/playerMovement"

interface MovementLegendProps {
    previousRoundNumber: number
    movements: Map<string, PlayerMovement>
}

const ORDER: MovementType[] = ["promotion", "relegation", "stay", "new", "returning", "adjusted"]

/** Exemple minimal servant uniquement à afficher l'icône du type dans la légende. */
function sample(type: MovementType): PlayerMovement {
    return {
        playerId: `legend-${type}`,
        type,
        fromGroupName: null,
        toGroupName: "",
        fromTier: null,
        toTier: 0,
        tierDelta: null,
        rank: null,
        points: null,
        expectedGroupName: null,
    }
}

/**
 * Clé de lecture des repères affichés à côté de chaque joueur, avec le décompte
 * par type. Sans elle, les icônes des tableaux sont indéchiffrables.
 */
export function MovementLegend({ previousRoundNumber, movements }: MovementLegendProps) {
    const counts = useMemo(() => {
        const map = new Map<MovementType, number>()
        for (const movement of movements.values()) {
            map.set(movement.type, (map.get(movement.type) ?? 0) + 1)
        }
        return map
    }, [movements])

    const present = ORDER.filter(type => (counts.get(type) ?? 0) > 0)

    if (present.length === 0) return null

    return (
        <div
            data-testid="movement-legend"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground border rounded-lg px-3 py-2"
        >
            <span className="font-medium text-foreground">
                Évolution depuis la Série {previousRoundNumber}
            </span>
            {present.map(type => (
                <span key={type} className="inline-flex items-center gap-1.5">
                    <PlayerMovementBadge movement={sample(type)} />
                    <span>{movementLabel(sample(type))}</span>
                    <span className="text-foreground font-medium">{counts.get(type)}</span>
                </span>
            ))}
            <span className="italic">Survolez un joueur pour le détail.</span>
        </div>
    )
}

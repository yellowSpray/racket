import type { ReactNode } from "react"
import type { GroupPlayer } from "@/types/draw"
import { ChartIncreaseIcon, ChartDecreaseIcon, UserRemove01Icon } from "hugeicons-react"

interface GroupPlayerRowProps {
    player: GroupPlayer
    /** Mouvement décidé par les règles du club, s'il y en a un. */
    moveType?: "promotion" | "relegation"
    /** Le joueur ne s'est pas réinscrit à la nouvelle série. */
    departed?: boolean
    /** Valeur affichée à droite : points de la série précédente, classement… */
    trailing?: ReactNode
}

/**
 * Ligne d'un joueur dans les colonnes de comparaison du mode « Box precedent ».
 *
 * Partagée par les trois colonnes statiques pour qu'un même joueur se lise de la
 * même façon partout : c'est le seul moyen fiable de suivre quelqu'un d'une
 * colonne à l'autre. Un départ prime visuellement sur le mouvement, parce qu'il
 * annule ce mouvement dans les faits.
 */
export function GroupPlayerRow({ player, moveType, departed, trailing }: GroupPlayerRowProps) {
    const background = departed
        ? "bg-gray-50 opacity-50 border-gray-200"
        : moveType === "promotion"
            ? "bg-emerald-50 border-emerald-200"
            : moveType === "relegation"
                ? "bg-red-50 border-red-200"
                : "border-gray-200"

    return (
        <div
            data-testid="player-row"
            className={`flex items-center justify-between w-full text-sm px-2 py-1.5 rounded border ${background}`}
        >
            <span className="flex items-center gap-2 min-w-0">
                <span className={`truncate ${departed ? "line-through text-muted-foreground" : ""}`}>
                    {player.first_name} {player.last_name}
                </span>
                {departed && (
                    <UserRemove01Icon
                        aria-label="Ne se réinscrit pas"
                        className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                    />
                )}
                {!departed && moveType === "promotion" && (
                    <ChartIncreaseIcon aria-label="Monte" className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                )}
                {!departed && moveType === "relegation" && (
                    <ChartDecreaseIcon aria-label="Descend" className="h-3.5 w-3.5 text-red-500 shrink-0" />
                )}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">{trailing}</span>
        </div>
    )
}

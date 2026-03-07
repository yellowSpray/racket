import type { GroupStandings, PromotionResult } from "@/types/ranking"
import { ChartIncreaseIcon, ChartDecreaseIcon, UserRemove01Icon } from "hugeicons-react"

interface PreviousBoxPreviewProps {
    standings: GroupStandings[]
    promotionResult: PromotionResult
    previousEventName: string
    registeredPlayerIds: Set<string>
}

export function PreviousBoxPreview({ standings, promotionResult, previousEventName, registeredPlayerIds }: PreviousBoxPreviewProps) {
    if (standings.length === 0) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4">
                Aucun classement disponible
            </div>
        )
    }

    // Build a lookup: playerId → move type
    const moveMap = new Map<string, "promotion" | "relegation">()
    for (const move of promotionResult.moves) {
        moveMap.set(move.playerId, move.type)
    }

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
                Classements — {previousEventName}
            </h4>
            {standings.map((group) => (
                <div key={group.groupId} className="border rounded-lg p-3">
                    <h5 className="font-semibold text-sm mb-2">{group.groupName}</h5>
                    <ul className="space-y-1">
                        {group.standings.map((player) => {
                            const moveType = moveMap.get(player.playerId)
                            const isUnregistered = !registeredPlayerIds.has(player.playerId)
                            return (
                                <li
                                    key={player.playerId}
                                    data-testid={`player-${player.playerId}`}
                                    className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                                        isUnregistered
                                            ? "bg-gray-50 opacity-50"
                                            : moveType === "promotion"
                                              ? "bg-emerald-50"
                                              : moveType === "relegation"
                                                ? "bg-red-50"
                                                : ""
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="text-muted-foreground w-5">{player.rank}.</span>
                                        <span className={isUnregistered ? "line-through text-muted-foreground" : ""}>
                                            {player.playerName}
                                        </span>
                                        {isUnregistered && (
                                            <span data-move="unregistered" className="text-muted-foreground">
                                                <UserRemove01Icon className="h-3.5 w-3.5" />
                                            </span>
                                        )}
                                        {!isUnregistered && moveType === "promotion" && (
                                            <span data-move="promotion" className="text-emerald-600">
                                                <ChartIncreaseIcon className="h-3.5 w-3.5" />
                                            </span>
                                        )}
                                        {!isUnregistered && moveType === "relegation" && (
                                            <span data-move="relegation" className="text-red-500">
                                                <ChartDecreaseIcon className="h-3.5 w-3.5" />
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{player.points} pts</span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ))}
        </div>
    )
}

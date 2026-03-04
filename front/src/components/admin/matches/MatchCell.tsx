import type { Match } from "@/types/match"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface MatchCellProps {
    match: Match | null
    editMode?: boolean
    scoreValue?: string
    onScoreChange?: (value: string) => void
}

function formatPlayerName(player: { first_name: string; last_name: string } | undefined): string {
    if (!player) return "?"
    return `${player.first_name} ${player.last_name[0]}.`
}

export function MatchCell({ match, editMode, scoreValue, onScoreChange }: MatchCellProps) {
    if (!match) {
        return (
            <div className="text-center text-gray-300 py-2">—</div>
        )
    }

    const p1 = match.player1
    const p2 = match.player2
    const groupName = match.group?.group_name
    const isP1Winner = match.winner_id === match.player1_id
    const isP2Winner = match.winner_id === match.player2_id
    const hasResult = !!match.winner_id && !!match.score

    return (
        <div className="text-xs p-1.5 gap-1 flex flex-col w-full">
            <div className="flex flex-row items-center gap-1">
                {groupName && (
                    <div className="shrink-0">
                        <Badge variant="default" className="text-[10px] px-1 py-0">
                            {groupName}
                        </Badge>
                    </div>
                )}
                <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
                    <span className={`truncate ${isP1Winner ? 'font-bold text-green-600' : ''}`}>
                        {formatPlayerName(p1)}
                    </span>
                    <span className="text-gray-400">vs</span>
                    <span className={`truncate ${isP2Winner ? 'font-bold text-green-600' : ''}`}>
                        {formatPlayerName(p2)}
                    </span>
                </div>
            </div>

            {/* Score display (mode lecture) */}
            {hasResult && !editMode && (
                <div className="text-center">
                    {match.score === "WO" ? (
                        <span className="inline-flex items-center text-[10px] px-1.5 py-0 rounded-full border border-amber-300 text-amber-600 font-medium">
                            WO
                        </span>
                    ) : (
                        <span className="font-semibold text-blue-600">{match.score}</span>
                    )}
                </div>
            )}

            {/* Score input (mode édition) */}
            {editMode && (
                <Input
                    type="text"
                    value={scoreValue ?? ""}
                    onChange={(e) => onScoreChange?.(e.target.value)}
                    placeholder="3-1"
                    className="h-6 text-xs text-center px-1"
                />
            )}
        </div>
    )
}

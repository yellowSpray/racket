import type { Match } from "@/types/match"
import { Badge } from "@/components/ui/badge"

interface MatchCellProps {
    match: Match | null
}

export function MatchCell({ match }: MatchCellProps) {
    if (!match) {
        return (
            <div className="text-center text-gray-300 py-2">—</div>
        )
    }

    const p1 = match.player1
    const p2 = match.player2
    const groupName = match.group?.group_name

    return (
        <div className="text-xs p-1.5 space-y-0.5">
            <div className="font-medium truncate">
                {p1 ? `${p1.first_name} ${p1.last_name.charAt(0)}.` : "?"}
            </div>
            <div className="text-center text-gray-400 text-[10px]">vs</div>
            <div className="font-medium truncate">
                {p2 ? `${p2.first_name} ${p2.last_name.charAt(0)}.` : "?"}
            </div>
            {groupName && (
                <Badge variant="default" className="text-[10px] px-1 py-0 mt-0.5">
                    {groupName}
                </Badge>
            )}
        </div>
    )
}

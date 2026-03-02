import type { Match } from "@/types/match"
import { Badge } from "@/components/ui/badge"

interface MatchCellProps {
    match: Match | null
}

export function MatchCell({ match }: MatchCellProps) {
    if (!match) {
        return (
            <div className="text-center text-gray-300 py-2">-</div>
        )
    }

    const p1 = match.player1
    const p2 = match.player2
    const groupName = match.group?.group_name

    return (
        <div className="text-xs p-1.5 gap-1 flex flex-row items-center w-full">
            {groupName && (
                <div className="w-1/6">
                    <Badge variant="default" className="text-[10px] px-1 py-0">
                        {groupName}
                    </Badge>
                </div>
            )}
            <div className="font-medium truncate text-center w-5/6">
                {p1 ? `${p1.first_name} ${p1.last_name}` : "?"}{" "}
                <span className="text-gray-400">vs</span>{" "}
                {p2 ? `${p2.first_name} ${p2.last_name}` : "?"}
            </div>
        </div>
    )
}

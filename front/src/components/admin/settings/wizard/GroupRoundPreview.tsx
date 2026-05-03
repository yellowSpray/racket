import type { Event } from "@/types/event"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useMemo } from "react"
import { generateGroupRounds, calculateDates } from "@/lib/matchScheduler"
import { DrawTable } from "@/components/admin/draws/DrawTable"

interface GroupRoundPreviewProps {
    event: Event
    groups: Group[]
}

export function GroupRoundPreview({ event, groups }: GroupRoundPreviewProps) {
    const dates = useMemo(
        () => calculateDates(event.start_date, event.end_date, event.playing_dates),
        [event.start_date, event.end_date, event.playing_dates]
    )

    const groupRounds = useMemo(() => generateGroupRounds(groups), [groups])

    const matchesByGroup = useMemo(() => {
        const result = new Map<string, Match[]>()

        groups.forEach((group, groupIdx) => {
            const rounds = groupRounds[groupIdx] ?? []
            const matches: Match[] = []

            rounds.forEach((round, roundIdx) => {
                const date = dates.length > 0 ? dates[roundIdx % dates.length] : ""
                round.pairings.forEach((p, pIdx) => {
                    matches.push({
                        id: `preview-${group.id}-${roundIdx}-${pIdx}`,
                        group_id: group.id,
                        player1_id: p.player1Id,
                        player2_id: p.player2Id,
                        match_date: date,
                        match_time: "",
                        court_number: null,
                        winner_id: null,
                        score: null,
                    })
                })
            })

            result.set(group.id, matches)
        })

        return result
    }, [groups, groupRounds, dates])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.map(group => (
                <DrawTable
                    key={group.id}
                    group={group}
                    matches={matchesByGroup.get(group.id) ?? []}
                />
            ))}
        </div>
    )
}

import type { Event } from "@/types/event"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useMemo } from "react"
import { generateGroupRounds, calculateDates, SCHEDULE_TEMPLATES } from "@/lib/matchScheduler"
import { DrawTable } from "@/components/admin/draws/DrawTable"

// Schedule templates: SCHEDULE_TEMPLATES[groupSize][playerPos_i][playerPos_j] = date index (0-based).
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
            const players = group.players ?? []
            const rounds = groupRounds[groupIdx] ?? []
            const template = SCHEDULE_TEMPLATES[players.length]
            const matches: Match[] = []

            rounds.forEach((round, roundIdx) => {
                round.pairings.forEach((p, pIdx) => {
                    let date = ""
                    if (dates.length > 0) {
                        if (template) {
                            const pos1 = players.findIndex(pl => pl.id === p.player1Id)
                            const pos2 = players.findIndex(pl => pl.id === p.player2Id)
                            const dateIdx = pos1 >= 0 && pos2 >= 0 ? template[pos1][pos2] : roundIdx
                            date = dates[dateIdx % dates.length] ?? ""
                        } else {
                            date = dates[roundIdx % dates.length] ?? ""
                        }
                    }
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

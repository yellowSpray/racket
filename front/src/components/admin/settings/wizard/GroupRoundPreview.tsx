import type { EventRound } from "@/types/event"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useMemo, useEffect } from "react"
import { generateGroupRounds, calculateDates, SCHEDULE_TEMPLATES, optimizePlayerOrderForAbsences } from "@/lib/matchScheduler"
import { DrawTable } from "@/components/admin/draws/DrawTable"

interface GroupRoundPreviewProps {
    round: EventRound
    groups: Group[]
    playerAbsences?: Map<string, string[]>
}

export function GroupRoundPreview({ round, groups, playerAbsences }: GroupRoundPreviewProps) {
    const dates = useMemo(
        () => calculateDates(round.start_date, round.end_date, round.playing_dates),
        [round.start_date, round.end_date, round.playing_dates]
    )

    useEffect(() => {
        console.group("[GroupRoundPreview] Absences joueurs")
        console.log("Dates de l'événement :", dates)
        if (!playerAbsences || playerAbsences.size === 0) {
            console.log("Aucune absence détectée")
        } else {
            console.log(`${playerAbsences.size} joueur(s) avec absences :`)
            for (const [playerId, absentDates] of playerAbsences) {
                const player = groups.flatMap(g => g.players || []).find(p => p.id === playerId)
                const name = player ? `${player.first_name} ${player.last_name}` : playerId
                const relevant = absentDates.filter(d => dates.includes(d))
                console.log(
                    `  ${name} — absences : [${absentDates.join(", ")}]` +
                    (relevant.length > 0 ? ` → impact sur dates event : [${relevant.join(", ")}]` : " → aucun impact sur les dates de l'event")
                )
            }
        }
        console.groupEnd()
    }, [playerAbsences, dates, groups])

    // Appliquer le même réordonnancement que le scheduler pour que les dates coïncident
    const optimizedGroups = useMemo(() => {
        if (!playerAbsences || playerAbsences.size === 0) return groups
        return groups.map(group => {
            const players = group.players || []
            const template = SCHEDULE_TEMPLATES[players.length]
            if (!template) return group
            return { ...group, players: optimizePlayerOrderForAbsences(players, template, dates, playerAbsences) }
        })
    }, [groups, playerAbsences, dates])

    const groupRounds = useMemo(() => generateGroupRounds(optimizedGroups), [optimizedGroups])

    const matchesByGroup = useMemo(() => {
        const result = new Map<string, Match[]>()

        optimizedGroups.forEach((group, groupIdx) => {
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
    }, [optimizedGroups, groupRounds, dates])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {optimizedGroups.map(group => (
                <DrawTable
                    key={group.id}
                    group={group}
                    matches={matchesByGroup.get(group.id) ?? []}
                />
            ))}
        </div>
    )
}

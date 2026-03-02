import type { Match } from "@/types/match"
import type { Event } from "@/types/event"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MatchCell } from "./MatchCell"
import { calculateTimeSlots } from "@/lib/matchScheduler"
import { intervalToMinutes } from "@/lib/utils"

interface MatchScheduleGridProps {
    matches: Match[]
    event: Event
}

function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

export function MatchScheduleGrid({ matches, event }: MatchScheduleGridProps) {

    // Calculer les créneaux et terrains depuis l'event
    const durationMin = intervalToMinutes(event.estimated_match_duration)
    const timeSlots = calculateTimeSlots(
        event.start_time || "19:00",
        event.end_time || "23:00",
        durationMin
    )

    // Extraire les terrains uniques depuis les matchs
    const courtsSet = new Set<string>()
    matches.forEach(m => {
        if (m.court_number) courtsSet.add(m.court_number)
    })
    const courts = Array.from(courtsSet).sort()

    // Si pas de terrains dans les matchs, générer depuis number_of_courts
    if (courts.length === 0) {
        for (let i = 1; i <= event.number_of_courts; i++) {
            courts.push(`Terrain ${i}`)
        }
    }

    // Grouper les matchs par date
    const matchesByDate = new Map<string, Match[]>()
    for (const match of matches) {
        const date = match.match_date
        if (!matchesByDate.has(date)) {
            matchesByDate.set(date, [])
        }
        matchesByDate.get(date)!.push(match)
    }

    // Trier les dates
    const sortedDates = Array.from(matchesByDate.keys()).sort()

    // Trouver un match pour un créneau donné
    const findMatch = (dayMatches: Match[], time: string, court: string): Match | null => {
        return dayMatches.find(m => {
            const matchTime = m.match_time?.match(/(\d{2}:\d{2})/)?.[1]
            return matchTime === time && m.court_number === court
        }) || null
    }

    return (
        <div className="border rounded-lg flex flex-col h-full min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 min-h-0" type="always">
                <div className="space-y-6 p-8">
                    {sortedDates.map(date => {
                        const dayMatches = matchesByDate.get(date) || []
                        const label = formatDateLabel(date)

                        return (
                            <div key={date}>
                                <h3 className="text-lg font-semibold capitalize mb-3">{label}</h3>
                                <div>
                                    <div className="overflow-x-auto border-gray-200 border-1 rounded-xl">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-20 text-center bg-gray-50 font-bold">
                                                        Heure
                                                    </TableHead>
                                                    {courts.map(court => (
                                                        <TableHead
                                                            key={court}
                                                            className="text-center bg-gray-50 font-bold min-w-[140px]"
                                                        >
                                                            {court}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {timeSlots.map(time => (
                                                    <TableRow key={time}>
                                                        <TableCell className="text-center font-medium bg-gray-50">
                                                            {time}
                                                        </TableCell>
                                                        {courts.map(court => (
                                                            <TableCell
                                                                key={court}
                                                                className="text-center border-l p-1"
                                                            >
                                                                <MatchCell match={findMatch(dayMatches, time, court)} />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {dayMatches.length} match{dayMatches.length > 1 ? 's' : ''} programmé{dayMatches.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}

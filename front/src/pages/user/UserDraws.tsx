import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useClubConfig } from "@/hooks/useClubConfig"
import type { EventRound } from "@/types/event"
import { DrawTable } from "@/components/admin/draws/DrawTable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function resolveRound(rounds: EventRound[] | undefined): EventRound | null {
    if (!rounds || rounds.length === 0) return null
    return rounds.find(r => r.status === "active") ?? rounds[rounds.length - 1]
}

export function UserDraws() {
    const { profile } = useAuth()
    const { currentEvent, currentRound, events } = useEvent()
    const { groups, fetchGroupsByRound, loading: groupsLoading } = useGroups()
    const { matches, fetchMatchesByRound, loading: matchesLoading } = useMatches()
    const { clubConfig, scoringRules, fetchClubConfig } = useClubConfig()
    const clubName = clubConfig?.club_name

    const defaultEventId = useMemo(() => {
        const eventWithActiveRound = events.find(e => e.event_rounds?.some(r => r.status === "active"))
        return eventWithActiveRound?.id ?? currentEvent?.id ?? ""
    }, [events, currentEvent])

    const [selectedEventId, setSelectedEventId] = useState<string>("")

    useEffect(() => {
        if (defaultEventId && !selectedEventId) {
            setSelectedEventId(defaultEventId)
        }
    }, [defaultEventId, selectedEventId])

    const selectedEvent = useMemo(
        () => events.find(e => e.id === selectedEventId) ?? currentEvent,
        [events, selectedEventId, currentEvent]
    )

    const selectedRound = useMemo(
        () => resolveRound(selectedEvent?.event_rounds) ?? currentRound,
        [selectedEvent, currentRound]
    )

    useEffect(() => {
        if (profile?.club_id) fetchClubConfig(profile.club_id)
    }, [profile?.club_id, fetchClubConfig])

    useEffect(() => {
        if (selectedRound?.id) {
            fetchGroupsByRound(selectedRound.id)
            fetchMatchesByRound(selectedRound.id)
        }
    }, [selectedRound?.id, fetchGroupsByRound, fetchMatchesByRound])

    const matchesByGroup = useMemo(() => {
        const map = new Map<string, typeof matches>()
        for (const group of groups) {
            map.set(group.id, matches.filter(m => m.group_id === group.id))
        }
        return map
    }, [groups, matches])

    if (events.length === 0 && !currentEvent) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Aucun événement en cours
            </div>
        )
    }

    const loading = groupsLoading || matchesLoading

    const header = (
        <div className="flex flex-wrap items-center gap-3 mb-6">
            {clubName && <h3 className="text-lg font-semibold shrink-0">{clubName}</h3>}
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-auto min-w-48 max-w-72">
                    <SelectValue placeholder="Choisir un événement" />
                </SelectTrigger>
                <SelectContent>
                    {events.map(event => {
                        const round = resolveRound(event.event_rounds)
                        return (
                            <SelectItem key={event.id} value={event.id}>
                                {event.event_name}
                                {round?.status === "active" && (
                                    <span className="ml-2 text-xs text-green-600 font-medium">En cours</span>
                                )}
                            </SelectItem>
                        )
                    })}
                </SelectContent>
            </Select>
        </div>
    )

    if (loading) {
        return (
            <div className="flex flex-col h-full min-h-0">
                {header}
                <p className="text-gray-500">Chargement...</p>
            </div>
        )
    }

    if (groups.length === 0) {
        return (
            <div className="flex flex-col h-full min-h-0">
                {header}
                <p className="text-gray-500">
                    {selectedEvent ? "Aucun groupe pour cet événement" : "Aucun événement sélectionné"}
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            {header}
            <ScrollArea className="flex-1 min-h-0" type="auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <DrawTable
                            key={group.id}
                            group={group}
                            matches={matchesByGroup.get(group.id) || []}
                            scoringRules={scoringRules ?? undefined}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

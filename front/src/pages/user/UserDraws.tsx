import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useClubs } from "@/hooks/useClub"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useClubConfig } from "@/hooks/useClubConfig"
import { DrawTable } from "@/components/admin/draws/DrawTable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Group } from "@/types/draw"

export function UserDraws() {
    const { profile } = useAuth()
    const { currentEvent } = useEvent()
    const { groups, fetchGroupsByEvent, loading: groupsLoading } = useGroups()
    const { matches, fetchMatchesByEvent, loading: matchesLoading } = useMatches()
    const { scoringRules, fetchClubConfig } = useClubConfig()
    const { clubs } = useClubs()
    const clubName = clubs.find(c => c.id === profile?.club_id)?.club_name

    useEffect(() => {
        if (profile?.club_id) fetchClubConfig(profile.club_id)
    }, [profile?.club_id, fetchClubConfig])

    useEffect(() => {
        if (currentEvent?.id) {
            fetchGroupsByEvent(currentEvent.id)
            fetchMatchesByEvent(currentEvent.id)
        }
    }, [currentEvent?.id, fetchGroupsByEvent, fetchMatchesByEvent])

    const myGroup: Group | null = useMemo(() => {
        if (!profile?.id || groups.length === 0) return null
        return groups.find(g =>
            g.players?.some(p => p.id === profile.id)
        ) ?? null
    }, [groups, profile?.id])

    const isParticipant = myGroup !== null

    const [tab, setTab] = useState(isParticipant ? "mon-tableau" : "tous")

    useEffect(() => {
        setTab(isParticipant ? "mon-tableau" : "tous")
    }, [isParticipant])

    const matchesByGroup = useMemo(() => {
        const map = new Map<string, typeof matches>()
        for (const group of groups) {
            map.set(group.id, matches.filter(m => m.group_id === group.id))
        }
        return map
    }, [groups, matches])

    if (!currentEvent) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Aucun événement en cours
            </div>
        )
    }

    const loading = groupsLoading || matchesLoading

    if (loading) {
        return (
            <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-semibold">{currentEvent.event_name}</h3>
                    {clubName && <span className="text-sm text-muted-foreground">- {clubName}</span>}
                </div>
                <p className="text-gray-500">Chargement...</p>
            </div>
        )
    }

    if (groups.length === 0) {
        return (
            <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-semibold">{currentEvent.event_name}</h3>
                    {clubName && <span className="text-sm text-muted-foreground">- {clubName}</span>}
                </div>
                <p className="text-gray-500">Aucun groupe pour cet événement</p>
            </div>
        )
    }

    if (!isParticipant) {
        return (
            <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-semibold">{currentEvent.event_name}</h3>
                    {clubName && <span className="text-sm text-muted-foreground">- {clubName}</span>}
                </div>
                <ScrollArea className="flex-1 min-h-0" type="always">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pr-4">
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

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{currentEvent.event_name}</h3>
                    {clubName && <span className="text-sm text-muted-foreground">- {clubName}</span>}
                </div>
                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList>
                        <TabsTrigger value="mon-tableau">Mon tableau</TabsTrigger>
                        <TabsTrigger value="tous">Tous les tableaux</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <ScrollArea className="flex-1 min-h-0" type="always">
                {tab === "mon-tableau" && myGroup && (
                    <div className="pr-4">
                        <DrawTable
                            group={myGroup}
                            matches={matchesByGroup.get(myGroup.id) || []}
                            scoringRules={scoringRules ?? undefined}
                        />
                    </div>
                )}

                {tab === "tous" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pr-4">
                        {groups.map(group => (
                            <DrawTable
                                key={group.id}
                                group={group}
                                matches={matchesByGroup.get(group.id) || []}
                                scoringRules={scoringRules ?? undefined}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}

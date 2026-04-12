import { useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useMatches } from "@/hooks/useMatches"
import { useGroups } from "@/hooks/useGroups"
import { useClubConfig } from "@/hooks/useClubConfig"
import { NextMatchCard } from "@/components/user/dashboard/NextMatchCard"
import { EvolutionCard } from "@/components/user/dashboard/EvolutionCard"
import { UserStatsCard } from "@/components/user/dashboard/UserStatsCard"
import { ScoreInputCard } from "@/components/user/dashboard/ScoreInputCard"
import { MyDrawCard } from "@/components/user/dashboard/MyDrawCard"
import { EloCard } from "@/components/user/dashboard/EloCard"
import { EventInfoCard } from "@/components/user/dashboard/EventInfoCard"
import type { Match } from "@/types/match"

export function UserDashboard() {
    const { profile } = useAuth()
    const { currentEvent } = useEvent()
    const { matches, fetchMatchesByEvent, submitPendingScore } = useMatches()
    const { groups, fetchGroupsByEvent } = useGroups()
    const { clubConfig, scoringRules, fetchClubConfig } = useClubConfig()

    useEffect(() => {
        if (currentEvent?.id) {
            fetchMatchesByEvent(currentEvent.id)
            fetchGroupsByEvent(currentEvent.id)
        }
    }, [currentEvent?.id, fetchMatchesByEvent, fetchGroupsByEvent])

    useEffect(() => {
        if (profile?.club_id) fetchClubConfig(profile.club_id)
    }, [profile?.club_id, fetchClubConfig])

    const myMatches = useMemo(() => {
        if (!profile?.id) return []
        return matches
            .filter(m => m.player1_id === profile.id || m.player2_id === profile.id)
            .sort((a, b) => {
                if (a.match_date !== b.match_date) return a.match_date.localeCompare(b.match_date)
                return (a.match_time || "").localeCompare(b.match_time || "")
            })
    }, [matches, profile?.id])

    const { upcoming, played } = useMemo(() => {
        const up: Match[] = []
        const pl: Match[] = []
        for (const m of myMatches) {
            if (m.winner_id) pl.push(m)
            else up.push(m)
        }
        return { upcoming: up, played: pl }
    }, [myMatches])

    const stats = useMemo(() => {
        if (!profile?.id) return { total: 0, wins: 0, losses: 0, ratio: 0 }
        let wins = 0, losses = 0
        for (const m of played) {
            if (m.score?.includes("ABS")) {
                const isAbsent = (m.score.startsWith("ABS") && m.player1_id === profile.id) ||
                    (m.score.endsWith("ABS") && m.player2_id === profile.id)
                if (isAbsent) continue
            }
            if (m.winner_id === profile.id) wins++
            else losses++
        }
        const decided = wins + losses
        return {
            total: myMatches.length,
            wins,
            losses,
            ratio: decided > 0 ? Math.round((wins / decided) * 100) : 0
        }
    }, [played, myMatches.length, profile?.id])

    const nextMatch = upcoming[0] ?? null

    const myGroup = useMemo(() => {
        if (!profile?.id || groups.length === 0) return null
        return groups.find(g => g.players?.some(p => p.id === profile.id)) ?? null
    }, [groups, profile?.id])

    return (
        <div className="flex flex-col h-full min-h-0 gap-5">
            <h3 className="text-lg font-semibold">Salut {profile?.first_name}</h3>

            <div className="flex-1 min-h-0 grid grid-cols-28 grid-rows-16 gap-5">
                <NextMatchCard
                    className="col-start-1 col-span-7 row-start-1 row-span-7"
                    nextMatch={nextMatch}
                    myId={profile?.id ?? ""}
                    totalMatches={myMatches.length}
                    myAvatarUrl={profile?.avatar_url}
                    myName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
                />
                <UserStatsCard
                    className="col-start-21 col-span-6 row-start-1 row-span-4"
                    stats={stats}
                />
                <EloCard
                    className="col-start-27 col-span-2 row-start-1 row-span-4"
                    elo={profile?.power_ranking}
                />
                <ScoreInputCard
                    className="col-start-1 col-span-7 row-start-8 row-span-9 min-h-0"
                    upcoming={upcoming}
                    played={played}
                    myId={profile?.id ?? ""}
                    onSubmitScore={submitPendingScore}
                />
                <MyDrawCard
                    className="col-start-8 col-span-13 row-start-5 row-span-12 min-h-0"
                    myGroup={myGroup}
                    matches={matches}
                    scoringRules={scoringRules ?? undefined}
                />
                <EvolutionCard
                    className="col-start-8 col-span-13 row-start-1 row-span-4 min-h-0"
                    profileId={profile?.id}
                />
                <EventInfoCard
                    className="col-start-21 col-span-8 row-start-5 row-span-12"
                    event={currentEvent}
                    clubConfig={clubConfig}
                    profileId={profile?.id ?? ""}
                />
            </div>
        </div>
    )
}

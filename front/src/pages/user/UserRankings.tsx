import { useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useClubConfig } from "@/hooks/useClubConfig"
import { calculateGroupStandings } from "@/lib/rankingEngine"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { GroupStandings } from "@/types/ranking"

export function UserRankings() {
    const { profile } = useAuth()
    const { currentEvent } = useEvent()
    const { groups, fetchGroupsByEvent, loading: groupsLoading } = useGroups()
    const { matches, fetchMatchesByEvent, loading: matchesLoading } = useMatches()
    const { scoringRules, fetchClubConfig } = useClubConfig()

    useEffect(() => {
        if (profile?.club_id) fetchClubConfig(profile.club_id)
    }, [profile?.club_id, fetchClubConfig])

    useEffect(() => {
        if (currentEvent?.id) {
            fetchGroupsByEvent(currentEvent.id)
            fetchMatchesByEvent(currentEvent.id)
        }
    }, [currentEvent?.id, fetchGroupsByEvent, fetchMatchesByEvent])

    const standings: GroupStandings[] = useMemo(() => {
        if (!scoringRules || groups.length === 0) return []
        return groups.map(group => {
            const groupMatches = matches.filter(m => m.group_id === group.id)
            const players = (group.players || []).map(p => ({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
            }))
            return calculateGroupStandings(groupMatches, group.id, group.group_name, players, scoringRules)
        })
    }, [groups, matches, scoringRules])

    const myStanding = useMemo(() => {
        if (!profile?.id) return null
        for (const gs of standings) {
            const found = gs.standings.find(s => s.playerId === profile.id)
            if (found) return { ...found, groupName: gs.groupName }
        }
        return null
    }, [standings, profile?.id])

    if (!currentEvent) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Aucun événement en cours
            </div>
        )
    }

    const loading = groupsLoading || matchesLoading

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Classement</h3>

            {loading ? (
                <p className="text-gray-500">Chargement...</p>
            ) : (
                <>
                    {/* Résumé personnel */}
                    {myStanding && (
                        <Card className="border-primary/30">
                            <CardContent className="flex items-center gap-6 py-4">
                                <div className="text-center">
                                    <p className="text-3xl font-bold">{myStanding.rank}<sup className="text-sm text-gray-400">e</sup></p>
                                    <p className="text-xs text-gray-500">{myStanding.groupName}</p>
                                </div>
                                <div className="flex gap-6 text-sm">
                                    <div className="text-center">
                                        <p className="text-lg font-semibold">{myStanding.points}</p>
                                        <p className="text-gray-500">Points</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold">{myStanding.wins}</p>
                                        <p className="text-gray-500">Victoires</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold">{myStanding.played}</p>
                                        <p className="text-gray-500">Joués</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Classements par groupe */}
                    {standings.length === 0 ? (
                        <p className="text-gray-500">Aucun classement disponible</p>
                    ) : (
                        <div className="space-y-6">
                            {standings.map(gs => (
                                <Card key={gs.groupId}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {gs.groupName}
                                            <Badge variant="outline" className="font-normal">
                                                {gs.standings.length} joueurs
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-8">#</TableHead>
                                                    <TableHead>Joueur</TableHead>
                                                    <TableHead className="text-center w-12">J</TableHead>
                                                    <TableHead className="text-center w-12">V</TableHead>
                                                    <TableHead className="text-center w-12">D</TableHead>
                                                    <TableHead className="text-center w-12">WO</TableHead>
                                                    <TableHead className="text-center w-16">Pts</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {gs.standings.map(s => (
                                                    <TableRow
                                                        key={s.playerId}
                                                        className={s.playerId === profile?.id ? "bg-primary/10 font-medium" : ""}
                                                    >
                                                        <TableCell className="font-mono text-gray-500">{s.rank}</TableCell>
                                                        <TableCell>{s.playerName}</TableCell>
                                                        <TableCell className="text-center">{s.played}</TableCell>
                                                        <TableCell className="text-center">{s.wins}</TableCell>
                                                        <TableCell className="text-center">{s.losses}</TableCell>
                                                        <TableCell className="text-center text-gray-400">
                                                            {s.walkoversWon > 0 || s.walkoversLost > 0
                                                                ? `${s.walkoversWon}/${s.walkoversLost}`
                                                                : "—"
                                                            }
                                                        </TableCell>
                                                        <TableCell className="text-center font-semibold">{s.points}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

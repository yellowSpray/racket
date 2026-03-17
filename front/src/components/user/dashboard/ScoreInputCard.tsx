import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskEdit01Icon, MapPinIcon, PencilEdit01Icon, Tick02Icon, Cancel01Icon } from "hugeicons-react"
import { getOpponentName, getMatchResult, getMyScore } from "@/lib/matchUtils"
import type { Match } from "@/types/match"

interface ScoreInputCardProps {
    upcoming: Match[]
    played: Match[]
    myId: string
    className?: string
    onSubmitScore?: (matchId: string, playerId: string, score: string) => Promise<"confirmed" | "pending" | "conflict" | false>
}

const SCORE_OPTIONS = ["3-0", "3-1", "3-2", "2-3", "1-3", "0-3", "ABS"]

export function ScoreInputCard({ upcoming, played, myId, className, onSubmitScore }: ScoreInputCardProps) {
    const total = upcoming.length + played.length
    const [editMode, setEditMode] = useState(false)
    const [pendingScores, setPendingScores] = useState<Map<string, string>>(new Map())
    const [saving, setSaving] = useState(false)

    const needsInput = upcoming.filter(m => !m.pending_score_p1 && !m.pending_score_p2).length

    const handleScoreChange = (matchId: string, score: string) => {
        setPendingScores(prev => {
            const next = new Map(prev)
            if (score) next.set(matchId, score)
            else next.delete(matchId)
            return next
        })
    }

    const handleSave = async () => {
        if (!onSubmitScore || pendingScores.size === 0) return
        setSaving(true)

        for (const [matchId, score] of pendingScores.entries()) {
            await onSubmitScore(matchId, myId, score)
        }

        setPendingScores(new Map())
        setEditMode(false)
        setSaving(false)
    }

    const handleCancel = () => {
        setPendingScores(new Map())
        setEditMode(false)
    }

    // Matchs joués = validés + pending (regroupés)
    const playedAndPending = [
        ...upcoming.filter(m => m.pending_score_p1 || m.pending_score_p2),
        ...played,
    ]
    // Matchs à jouer = sans pending ni résultat
    const toPlay = upcoming.filter(m => !m.pending_score_p1 && !m.pending_score_p2)

    return (
        <Card className={`${className} flex flex-col`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <TaskEdit01Icon size={16} className="text-foreground" />
                    Mes matchs
                    <div className="flex items-center gap-2 ml-auto">
                        {needsInput > 0 && !editMode && (
                            <Badge variant="default" className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300">
                                {needsInput} à saisir
                            </Badge>
                        )}
                        {onSubmitScore && (
                            editMode ? (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                                        <Cancel01Icon size={14} />
                                    </Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving || pendingScores.size === 0}>
                                        <Tick02Icon size={14} />
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                                    <PencilEdit01Icon size={14} />
                                </Button>
                            )
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {total === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <TaskEdit01Icon size={28} className="mb-3" />
                        <p className="text-sm text-center">Aucun match programmé</p>
                    </div>
                ) : (
                    <ScrollArea className="h-full" type="auto">
                        <div className="space-y-4 pr-2">
                            {toPlay.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        À jouer ({toPlay.length})
                                    </h4>
                                    {toPlay.map(match => (
                                        <MatchRow
                                            key={match.id}
                                            match={match}
                                            myId={myId}
                                            editMode={editMode}
                                            pendingScore={pendingScores.get(match.id)}
                                            onScoreChange={handleScoreChange}
                                        />
                                    ))}
                                </div>
                            )}
                            {playedAndPending.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Joués ({playedAndPending.length})
                                    </h4>
                                    {playedAndPending.map(match => (
                                        <MatchRow
                                            key={match.id}
                                            match={match}
                                            myId={myId}
                                            editMode={editMode}
                                            pendingScore={pendingScores.get(match.id)}
                                            onScoreChange={handleScoreChange}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}

function getPendingStatus(match: Match, myId: string): { label: string; variant: "pending" | "active" | "inactive" } | null {
    const isPlayer1 = match.player1_id === myId
    const myPending = isPlayer1 ? match.pending_score_p1 : match.pending_score_p2
    const otherPending = isPlayer1 ? match.pending_score_p2 : match.pending_score_p1

    if (myPending && otherPending && myPending !== otherPending) {
        return { label: "Conflit", variant: "inactive" }
    }
    if (myPending && !otherPending) {
        return { label: "Envoyé", variant: "pending" }
    }
    if (!myPending && otherPending) {
        return { label: "À confirmer", variant: "active" }
    }
    return null
}

function getMyPendingScore(match: Match, myId: string): string | null {
    const isPlayer1 = match.player1_id === myId
    const pending = isPlayer1 ? match.pending_score_p1 : match.pending_score_p2
    if (!pending) return null
    if (isPlayer1) return pending
    const parts = pending.split("-")
    if (parts.length !== 2) return pending
    return `${parts[1]}-${parts[0]}`
}

function MatchRow({ match, myId, editMode, pendingScore, onScoreChange }: {
    match: Match
    myId: string
    editMode?: boolean
    pendingScore?: string
    onScoreChange?: (matchId: string, score: string) => void
}) {
    const opponent = getOpponentName(match, myId)
    const result = getMatchResult(match, myId)
    const score = getMyScore(match, myId)
    const pendingStatus = getPendingStatus(match, myId)
    const myPendingScore = getMyPendingScore(match, myId)
    const isValidated = !!match.winner_id
    const hasPending = match.pending_score_p1 || match.pending_score_p2

    return (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0">
            <span className="text-xs text-muted-foreground shrink-0 w-14 text-center">
                {new Date(match.match_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
            <div className="w-px h-6 bg-border shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">vs {opponent}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    {match.group?.group_name && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            {match.group.group_name}
                        </Badge>
                    )}
                    {match.court_number && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <MapPinIcon size={11} />
                            {match.court_number}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {editMode && !isValidated ? (
                    <select
                        value={pendingScore ?? ""}
                        onChange={e => onScoreChange?.(match.id, e.target.value)}
                        className="text-xs border rounded-md px-2 py-1 bg-background"
                    >
                        <option value="">—</option>
                        {SCORE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : hasPending && !isValidated ? (
                    <>
                        {myPendingScore && (
                            <span className="text-xs font-mono text-muted-foreground">{myPendingScore}</span>
                        )}
                        {pendingStatus && (
                            <Badge variant={pendingStatus.variant}>{pendingStatus.label}</Badge>
                        )}
                    </>
                ) : match.score?.includes("ABS") ? (
                    <Badge variant="pending">Forfait</Badge>
                ) : (
                    <>
                        {score && (
                            <span className="text-sm font-mono font-medium">{score}</span>
                        )}
                        {result ? (
                            <Badge variant={result.variant}>{result.label}</Badge>
                        ) : (
                            <Badge variant="inactive" className="text-xs">en attente</Badge>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

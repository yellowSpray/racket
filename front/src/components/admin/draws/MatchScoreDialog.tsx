import { useEffect, useState } from "react"
import type { Match } from "@/types/match"
import type { GroupPlayer } from "@/types/draw"
import { useHeadToHead } from "@/hooks/useHeadToHead"
import { orientScore } from "@/lib/matchScore"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar03Icon, Clock01Icon } from "hugeicons-react"

interface MatchScoreDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    match: Match | null
    /** Joueur de la ligne : le score se saisit de son point de vue. */
    rowPlayer: GroupPlayer | null
    opponent: GroupPlayer | null
    /** Reçoit le score déjà orienté « joueur de la ligne d'abord ». */
    onSave: (matchId: string, orientedScore: string) => void | Promise<void>
    saving?: boolean
}

const SCORE_OPTIONS = ["", "0", "1", "2", "3", "ABS"]

function fullName(player: GroupPlayer | null) {
    return player ? `${player.first_name} ${player.last_name}` : ""
}

function formatDate(date: string | undefined) {
    if (!date) return ""
    return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

/** Découpe un score orienté « moi-adversaire » en deux valeurs de sélecteur. */
function splitScore(score: string): [string, string] {
    if (!score) return ["", ""]
    const parts = score.split("-")
    if (parts.length !== 2) return ["", ""]
    return [parts[0], parts[1]]
}

/**
 * Saisie du score d'une rencontre depuis le tableau, avec l'historique des
 * confrontations entre les deux joueurs.
 *
 * Le score se saisit **du point de vue du joueur de la ligne**, comme il s'affiche
 * dans la case : c'est ce que l'admin lit sous les yeux. La conversion vers le
 * format de la base (`player1-player2`) est faite par l'appelant.
 */
export function MatchScoreDialog({
    open, onOpenChange, match, rowPlayer, opponent, onSave, saving,
}: MatchScoreDialogProps) {
    const { matches: history, summary, loading, fetchHistory } = useHeadToHead()

    const [myScore, setMyScore] = useState("")
    const [theirScore, setTheirScore] = useState("")

    const matchId = match?.id
    const rowPlayerId = rowPlayer?.id

    /*
     * Reinitialisation a chaque ouverture et a chaque changement de match.
     * Se caler sur la valeur du score ne suffisait pas : deux cases sans score
     * donnent la meme valeur, l'effet ne se rejouait donc pas et une saisie
     * abandonnee restait affichee sur la case suivante.
     */
    useEffect(() => {
        if (!open) return
        const current = match && rowPlayer ? orientScore(match, rowPlayer.id) : ""
        const [mine, theirs] = splitScore(current)
        setMyScore(mine)
        setTheirScore(theirs)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, matchId, rowPlayerId])

    useEffect(() => {
        if (!open || !match || !rowPlayer || !opponent) return
        fetchHistory(rowPlayer.id, opponent.id, match.id)
    }, [open, match, rowPlayer, opponent, fetchHistory])

    /** Une absence met mécaniquement l'adversaire à zéro. */
    const handleChange = (side: "mine" | "theirs", value: string) => {
        if (side === "mine") {
            setMyScore(value)
            if (value === "ABS") setTheirScore("0")
        } else {
            setTheirScore(value)
            if (value === "ABS") setMyScore("0")
        }
    }

    const complete = myScore !== "" && theirScore !== ""

    const handleSave = () => {
        if (!match || !complete) return
        const value = myScore === "ABS" ? "ABS" : theirScore === "ABS" ? "0-ABS" : `${myScore}-${theirScore}`
        onSave(match.id, value === "ABS" ? "ABS-0" : value)
    }

    if (!match || !rowPlayer || !opponent) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] bg-white">
                <DialogHeader>
                    <DialogTitle>
                        {fullName(rowPlayer)} <span className="text-muted-foreground font-normal">contre</span> {fullName(opponent)}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                            <Calendar03Icon className="h-3.5 w-3.5" />
                            {formatDate(match.match_date)}
                        </span>
                        {match.match_time && (
                            <span className="inline-flex items-center gap-1">
                                <Clock01Icon className="h-3.5 w-3.5" />
                                {match.match_time.slice(0, 5)}
                            </span>
                        )}
                        {match.court_number && <span>Terrain {match.court_number}</span>}
                    </DialogDescription>
                </DialogHeader>

                {/* Saisie du score */}
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="score-row">{fullName(rowPlayer)}</Label>
                        <select
                            id="score-row"
                            aria-label={`Score ${fullName(rowPlayer)}`}
                            value={myScore}
                            onChange={e => handleChange("mine", e.target.value)}
                            className="h-9 rounded-md border border-input px-3 text-sm"
                        >
                            {SCORE_OPTIONS.map(o => <option key={o} value={o}>{o || "-"}</option>)}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="score-opponent">{fullName(opponent)}</Label>
                        <select
                            id="score-opponent"
                            aria-label={`Score ${fullName(opponent)}`}
                            value={theirScore}
                            onChange={e => handleChange("theirs", e.target.value)}
                            className="h-9 rounded-md border border-input px-3 text-sm"
                        >
                            {SCORE_OPTIONS.map(o => <option key={o} value={o}>{o || "-"}</option>)}
                        </select>
                    </div>
                </div>

                {/* Historique des confrontations */}
                <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">Confrontations passées</h4>
                        {summary.played > 0 && (
                            <Badge variant="default">
                                {summary.wins} victoire{summary.wins > 1 ? "s" : ""}, {summary.losses} défaite{summary.losses > 1 ? "s" : ""}
                            </Badge>
                        )}
                    </div>

                    {loading ? (
                        <p className="text-sm text-muted-foreground">Chargement…</p>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                            Première rencontre entre ces deux joueurs.
                        </p>
                    ) : (
                        <ul className="max-h-48 overflow-y-auto space-y-1">
                            {history.map(past => {
                                const score = orientScore(past, rowPlayer.id)
                                const won = past.winner_id === rowPlayer.id
                                return (
                                    <li
                                        key={past.id}
                                        className="flex items-center justify-between gap-3 text-sm px-2 py-1.5 rounded border border-gray-200"
                                    >
                                        <span className="text-muted-foreground">{formatDate(past.match_date)}</span>
                                        <span className="text-muted-foreground truncate">{past.group?.group_name}</span>
                                        <span className={`font-semibold ${won ? "text-emerald-600" : "text-red-500"}`}>
                                            {score || "-"}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!complete || saving}>
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

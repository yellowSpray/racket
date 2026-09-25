import type { Match } from "@/types/match"
import { Badge } from "@/components/ui/badge"
import { PastilleDeScore } from "./PastilleDeScore"

interface MatchCellProps {
    match: Match | null
    editMode?: boolean
    scoreValue?: string
    onScoreChange?: (value: string) => void
    /**
     * Les deux noms l'un sous l'autre plutôt que côte à côte.
     *
     * C'est la forme de la cellule dans la liste par terrain, sur téléphone :
     * une rangée fait 343 px, et deux noms côte à côte y donnaient
     * « Nicolas Debuss… vs Thomas Vandenb… ». Empilés, ils tiennent en entier.
     * Le « vs » disparaît avec l'alignement : deux lignes superposées disent
     * déjà qu'elles s'opposent.
     */
    empile?: boolean
}

const SCORE_OPTIONS = [
    { value: "", label: "-" },
    { value: "0", label: "0" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "ABS", label: "ABS" },
]

function formatPlayerName(player: { first_name: string; last_name: string } | undefined): string {
    if (!player) return "?"
    return `${player.first_name} ${player.last_name}`
}

/** Parse "3-1" → ["3", "1"], "ABS-0" → ["ABS", "0"], "" → ["", ""] */
function parseScoreValue(value: string | undefined): [string, string] {
    if (!value) return ["", ""]
    if (value === "WO") return ["", ""]
    const parts = value.split("-")
    if (parts.length === 2) return [parts[0], parts[1]]
    return ["", ""]
}

export function MatchCell({ match, editMode, scoreValue, onScoreChange, empile }: MatchCellProps) {
    if (!match) {
        return (
            <div className="text-center text-gray-300 py-2">-</div>
        )
    }

    const p1 = match.player1
    const p2 = match.player2
    const groupName = match.group?.group_name
    const isP1Winner = match.winner_id === match.player1_id
    const isP2Winner = match.winner_id === match.player2_id
    const hasResult = !!match.winner_id && !!match.score

    const [score1, score2] = parseScoreValue(scoreValue)

    const handleScorePartChange = (part: 1 | 2, value: string) => {
        let s1 = part === 1 ? value : score1
        let s2 = part === 2 ? value : score2
        // Si un joueur est ABS, l'autre est automatiquement 0
        if (value === "ABS") {
            if (part === 1) s2 = "0"
            else s1 = "0"
        }
        // Si les deux sont vides, on envoie ""
        if (!s1 && !s2) {
            onScoreChange?.("")
        } else {
            onScoreChange?.(`${s1}-${s2}`)
        }
    }

    const isP1Abs = score2 === "ABS"
    const isP2Abs = score1 === "ABS"

    /*
     * Le score et ses deux sélecteurs sont les mêmes dans les deux formes :
     * une seule règle de saisie, écrite une fois.
     */
    const controleDuScore = editMode ? (
        <>
            <select
                aria-label="Score joueur 1"
                value={isP1Abs ? "" : score1}
                onChange={(e) => handleScorePartChange(1, e.target.value)}
                disabled={isP1Abs}
                className="h-6 w-12 text-xs text-center border rounded px-0.5 bg-white disabled:opacity-50 shrink-0"
            >
                {SCORE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <select
                aria-label="Score joueur 2"
                value={isP2Abs ? "" : score2}
                onChange={(e) => handleScorePartChange(2, e.target.value)}
                disabled={isP2Abs}
                className="h-6 w-12 text-xs text-center border rounded px-0.5 bg-white disabled:opacity-50 shrink-0"
            >
                {SCORE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </>
    ) : hasResult ? (
        match.score === "WO" ? (
            <span className="inline-flex items-center text-[10px] px-1.5 py-0 rounded-full border border-amber-300 text-amber-600 font-medium shrink-0">
                WO
            </span>
        ) : (
            <span className="font-semibold text-blue-600 shrink-0">{match.score?.includes("ABS") ? "Abs" : match.score}</span>
        )
    ) : null

    if (empile) {
        /*
         * LE VAINQUEUR SE DIT PAR LA GRAISSE, ET RIEN D'AUTRE, la regle du
         * tableau de bord. Le vert se lisait comme un etat « valide » alors
         * qu'il ne dit que « a gagne », et il entrait en concurrence avec le
         * vert du score juste a cote.
         */
        return (
            <div className="flex w-full min-w-0 items-center gap-2 text-xs">
                <div className="min-w-0 flex-1 text-sm leading-5">
                    <span data-joueur className={`block truncate ${isP1Winner ? "font-semibold" : ""}`}>
                        {formatPlayerName(p1)}
                    </span>
                    <span data-joueur className={`block truncate ${isP2Winner ? "font-semibold" : ""}`}>
                        {formatPlayerName(p2)}
                    </span>
                </div>
                {groupName && (
                    <Badge variant="default" className="shrink-0 px-1 py-0 text-[10px]">
                        {groupName}
                    </Badge>
                )}
                {/*
                  * En saisie, les deux selecteurs ; sinon une pastille, la
                  * meme grammaire que la tuile des matchs : un fond plein dit
                  * qu'un resultat est acquis, un contour qu'on attend encore.
                  */}
                {editMode ? (
                    <div className="flex shrink-0 items-center gap-1">{controleDuScore}</div>
                ) : (
                    <PastilleDeScore match={match} />
                )}
            </div>
        )
    }

    return (
        <div className="text-xs p-1.5 flex items-center justify-center gap-1 w-full min-w-0">
            {/* Badge groupe */}
            {groupName && (
                <Badge variant="default" className="text-[10px] px-1 py-0 shrink-0">
                    {groupName}
                </Badge>
            )}

            {/* Joueur 1 */}
            <span className={`flex-1 min-w-0 truncate text-right ${isP1Winner ? 'font-bold text-green-600' : ''}`}>
                {formatPlayerName(p1)}
            </span>

            {/* Score, ou « vs » tant qu'il n'y a rien a montrer. */}
            {controleDuScore ?? <span className="text-gray-400 shrink-0">vs</span>}

            {/* Joueur 2 */}
            <span className={`flex-1 min-w-0 truncate text-left ${isP2Winner ? 'font-bold text-green-600' : ''}`}>
                {formatPlayerName(p2)}
            </span>
        </div>
    )
}

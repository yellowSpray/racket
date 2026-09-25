import type { Match } from "@/types/match"
import type { PlayerType } from "@/types/player"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BARRE_MASQUEE_TELEPHONE } from "@/lib/scrollArea"
import { ArrowDown01Icon, ArrowUp01Icon } from "hugeicons-react"
import { matchesPlayerSearch } from "@/lib/matchSearch"
import { PastilleDeScore } from "./PastilleDeScore"

interface MatchListViewProps {
    matches: Match[]
    players: PlayerType[]
    searchQuery?: string
    editMode?: boolean
    pendingScores?: Map<string, string>
    onScoreChange?: (matchId: string, value: string) => void
    playerAbsences?: Map<string, string[]>
    /** La journée affichée, choisie dans la barre de dates de la page. */
    date?: string | null
}

const SCORE_OPTIONS = [
    { value: "", label: "-" },
    { value: "0", label: "0" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "ABS", label: "ABS" },
]

function formatTime(matchTime: string | null): string {
    if (!matchTime) return "-"
    const m = matchTime.match(/(\d{2}:\d{2})/)
    return m ? m[1] : matchTime
}

function formatPlayerName(player: { first_name: string; last_name: string } | undefined): string {
    if (!player) return "?"
    return `${player.first_name} ${player.last_name}`
}

function buildRestrictionsMap(players: PlayerType[]): Map<string, { arrival: string; departure: string }> {
    const map = new Map<string, { arrival: string; departure: string }>()
    for (const p of players) {
        if (p.arrival || p.departure) {
            map.set(p.id, { arrival: p.arrival || "", departure: p.departure || "" })
        }
    }
    return map
}

/**
 * Les heures d'arrivee et de depart d'un joueur.
 *
 * `muette` : dans la liste, une restriction absente n'ecrit rien. Le tiret est
 * une reponse a une colonne qui pose la question ; sans colonne, il n'y a pas
 * de question.
 */
function RestrictionDisplay({ restrictions, playerId, muette = false }: { restrictions: Map<string, { arrival: string; departure: string }>; playerId: string | undefined; muette?: boolean }) {
    const rien = muette ? null : <span>-</span>
    if (!playerId) return rien
    const r = restrictions.get(playerId)
    if (!r || (!r.arrival && !r.departure)) return rien
    return (
        <span className={`inline-flex shrink-0 items-center gap-1 ${muette ? "text-xs text-muted-foreground" : ""}`}>
            {r.arrival && (
                <span className="inline-flex items-center gap-0.5">
                    <ArrowDown01Icon className="h-3 w-3" />{r.arrival}
                </span>
            )}
            {r.departure && (
                <span className="inline-flex items-center gap-0.5">
                    <ArrowUp01Icon className="h-3 w-3" />{r.departure}
                </span>
            )}
        </span>
    )
}

/** Parse "3-1" → ["3", "1"] */
function parseScoreValue(value: string | undefined): [string, string] {
    if (!value) return ["", ""]
    if (value === "WO") return ["", ""]
    const parts = value.split("-")
    if (parts.length === 2) return [parts[0], parts[1]]
    return ["", ""]
}

function ScoreEditor({ matchId, scoreValue, onScoreChange }: {
    matchId: string
    scoreValue: string | undefined
    onScoreChange?: (matchId: string, value: string) => void
}) {
    const [score1, score2] = parseScoreValue(scoreValue)

    const handleScorePartChange = (part: 1 | 2, value: string) => {
        let s1 = part === 1 ? value : score1
        let s2 = part === 2 ? value : score2
        if (value === "ABS") {
            if (part === 1) s2 = "0"
            else s1 = "0"
        }
        if (!s1 && !s2) {
            onScoreChange?.(matchId, "")
        } else {
            onScoreChange?.(matchId, `${s1}-${s2}`)
        }
    }

    const isP1Abs = score2 === "ABS"
    const isP2Abs = score1 === "ABS"

    return (
        <div className="flex items-center gap-1">
            <select
                aria-label="Score joueur 1"
                value={isP1Abs ? "" : score1}
                onChange={(e) => handleScorePartChange(1, e.target.value)}
                disabled={isP1Abs}
                className="h-6 w-12 text-xs text-center border rounded px-0.5 bg-white disabled:opacity-50"
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
                className="h-6 w-12 text-xs text-center border rounded px-0.5 bg-white disabled:opacity-50"
            >
                {SCORE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    )
}

function ScoreDisplay({ match }: { match: Match }) {
    if (!match.score) return <span className="text-gray-400">-</span>
    if (match.score === "WO") {
        return (
            <span className="inline-flex items-center text-xs px-1.5 py-0 rounded-full border border-amber-300 text-amber-600 font-medium">
                WO
            </span>
        )
    }
    if (match.score.includes("ABS")) {
        return <span className="font-semibold text-blue-600">Abs</span>
    }
    return <span className="font-semibold text-blue-600">{match.score}</span>
}


/** Le tag d'un joueur annonce absent ce jour-la. */
function TagAbsent() {
    return <span className="shrink-0 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-600">Abs</span>
}

/**
 * Absent veut dire : annonce indisponible ce jour-la, et le match n'a pas
 * encore de score. Une fois le score pose, l'absence est dans le resultat.
 */
function estAbsent(match: Match, playerId: string, absences?: Map<string, string[]>): boolean {
    return !match.score && !!absences?.get(playerId)?.includes(match.match_date)
}

/**
 * LA VUE PAR BOXE SUR TELEPHONE.
 *
 * Les huit colonnes de la table demandent 740 px pour que les deux noms
 * gardent 150 px chacun ; la colonne de contenu n'en offre 753 qu'a partir de
 * 1024 px d'ecran. En dessous, les noms se coupent, et en pourcentages ils se
 * chevauchaient carrement.
 *
 * Les deux noms passent donc l'un sous l'autre, en entier, avec la restriction
 * collee au joueur qu'elle concerne plutot que dans deux colonnes separees :
 * « des 19:30 » sous un nom se lit, la meme information dans une colonne
 * « Restr. » trois cases plus loin demande de compter les colonnes.
 */
function ListeParBoxe({
    matchs, restrictions, editMode, pendingScores, onScoreChange, playerAbsences,
}: {
    matchs: Match[]
    restrictions: Map<string, { arrival: string; departure: string }>
    date?: string | null
    editMode?: boolean
    pendingScores?: Map<string, string>
    onScoreChange?: (matchId: string, value: string) => void
    playerAbsences?: Map<string, string[]>
}) {
    return (
        <div data-liste-par-boxe className="lg:hidden">
            {matchs.map((match, i) => {
                const joueurs = [
                    { id: match.player1_id, p: match.player1, gagnant: match.winner_id === match.player1_id },
                    { id: match.player2_id, p: match.player2, gagnant: match.winner_id === match.player2_id },
                ]
                return (
                    <div
                        key={match.id}
                        data-ligne-match
                        className={`flex items-center gap-3 py-2.5 ${i === matchs.length - 1 ? "" : "border-b border-border"}`}
                    >
                        <div className="min-w-0 flex-1 text-sm leading-5">
                            {joueurs.map(({ id, p, gagnant }) => (
                                <span key={id} data-joueur className="flex min-w-0 items-center gap-1.5">
                                    <span className={`truncate ${gagnant ? "font-semibold" : ""}`}>
                                        {formatPlayerName(p)}
                                    </span>
                                    <RestrictionDisplay restrictions={restrictions} playerId={id} muette />
                                    {estAbsent(match, id, playerAbsences) && <TagAbsent />}
                                </span>
                            ))}
                            <span data-situation className="block truncate text-xs text-muted-foreground">
                                {[formatTime(match.match_time), match.court_number].filter(Boolean).join(" \u00b7 ")}
                            </span>
                        </div>
                        <div className="shrink-0">
                            {editMode ? (
                                <ScoreEditor
                                    matchId={match.id}
                                    scoreValue={pendingScores?.get(match.id)}
                                    onScoreChange={onScoreChange}
                                />
                            ) : (
                                <PastilleDeScore match={match} />
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export function MatchListView({ matches, players, searchQuery = "", editMode, pendingScores, onScoreChange, playerAbsences, date = null }: MatchListViewProps) {
    const restrictions = buildRestrictionsMap(players)

    // Meme regle de comparaison que la vue par terrain, pour que les deux vues
    // repondent identiquement a une meme recherche.
    const filteredMatches = matches.filter(m => matchesPlayerSearch(m, searchQuery))

    // Group matches by date, then by box (group_name)
    const matchesByDate = new Map<string, Match[]>()
    for (const match of filteredMatches) {
        const date = match.match_date
        if (!matchesByDate.has(date)) matchesByDate.set(date, [])
        matchesByDate.get(date)!.push(match)
    }
    const toutesLesDates = Array.from(matchesByDate.keys()).sort()
    const sortedDates = date ? toutesLesDates.filter(d => d === date) : toutesLesDates

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <ScrollArea className={`flex-1 min-h-0 ${BARRE_MASQUEE_TELEPHONE}`} type="auto">
                <div className="space-y-6">
                    {sortedDates.map(date => {
                        const dayMatches = matchesByDate.get(date) || []

                        // Group by box (group_name)
                        const byBox = new Map<string, Match[]>()
                        for (const m of dayMatches) {
                            const boxName = m.group?.group_name || "Sans groupe"
                            if (!byBox.has(boxName)) byBox.set(boxName, [])
                            byBox.get(boxName)!.push(m)
                        }
                        const sortedBoxes = Array.from(byBox.keys()).sort()

                        return (
                            <div key={date}>
                                <div className="space-y-4">
                                    {sortedBoxes.map(boxName => {
                                        const boxMatches = byBox.get(boxName)!
                                            .sort((a, b) => (a.match_time || "").localeCompare(b.match_time || ""))

                                        return (
                                            <div key={boxName}>
                                                {/*
                                                  * LA BOXE EST UN INTERTITRE, PLUS UNE COLONNE. Elle
                                                  * etait repetee a l'identique sur chaque rangee d'une
                                                  * table qui ne contient qu'elle. La date a disparu
                                                  * pour la meme raison : la page n'affiche qu'une
                                                  * journee et sa barre la porte.
                                                  */}
                                                <div className="flex items-center gap-2 pb-1 pt-1 text-xs font-semibold text-muted-foreground">
                                                    {boxName}
                                                    <span aria-hidden className="h-px flex-1 bg-border" />
                                                </div>

                                                <ListeParBoxe
                                                    matchs={boxMatches}
                                                    restrictions={restrictions}
                                                    date={date}
                                                    editMode={editMode}
                                                    pendingScores={pendingScores}
                                                    onScoreChange={onScoreChange}
                                                    playerAbsences={playerAbsences}
                                                />

                                                <div className="hidden overflow-x-auto rounded-xl border border-gray-200 lg:block">
                                                    <Table className="table-fixed w-full">
                                                        {/*
                                                          * DES LARGEURS FIXES POUR CE QUI A UNE TAILLE
                                                          * FIXE, une seule colonne elastique. En
                                                          * pourcentages, un nom recevait 18 % de la
                                                          * table, soit 59 px a 375 : les mots sortaient
                                                          * de leur cellule et se chevauchaient, 224
                                                          * debordements mesures. Meme lecon que le
                                                          * tableau des matchs du tableau de bord.
                                                          */}
                                                        <colgroup>
                                                            <col />
                                                            <col className="w-[72px]" />
                                                            <col className="w-[32px]" />
                                                            <col />
                                                            <col className="w-[72px]" />
                                                            <col className="w-[64px]" />
                                                            <col className="w-[96px]" />
                                                            <col className="w-[104px]" />
                                                        </colgroup>
                                                        <TableHeader>
                                                            <TableRow className="border-b border-gray-200 bg-gray-100 font-bold text-xs">
                                                                <TableHead className="font-bold">Joueur A</TableHead>
                                                                <TableHead className="font-bold text-center">Restr.</TableHead>
                                                                <TableHead className="font-bold text-center">vs</TableHead>
                                                                <TableHead className="font-bold">Joueur B</TableHead>
                                                                <TableHead className="font-bold text-center">Restr.</TableHead>
                                                                <TableHead className="font-bold text-center">Heure</TableHead>
                                                                <TableHead className="font-bold text-center">Terrain</TableHead>
                                                                <TableHead className="font-bold text-center">Score</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {boxMatches.map(match => {
                                                                const isP1Winner = match.winner_id === match.player1_id
                                                                const isP2Winner = match.winner_id === match.player2_id
                                                                const p1Absent = estAbsent(match, match.player1_id, playerAbsences)
                                                                const p2Absent = estAbsent(match, match.player2_id, playerAbsences)

                                                                return (
                                                                    <TableRow key={match.id} className={`border-b border-gray-200 last:border-b-0 ${p1Absent || p2Absent ? "bg-amber-50" : ""}`}>
                                                                        <TableCell className={isP1Winner ? "font-bold text-green-600" : ""}>
                                                                            <span className="flex items-center gap-1.5">
                                                                                <span className="truncate">{formatPlayerName(match.player1)}</span>
                                                                                {p1Absent && <TagAbsent />}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-xs text-gray-500">
                                                                            <RestrictionDisplay restrictions={restrictions} playerId={match.player1_id} />
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-gray-400">vs</TableCell>
                                                                        <TableCell className={isP2Winner ? "font-bold text-green-600" : ""}>
                                                                            <span className="flex items-center gap-1.5">
                                                                                <span className="truncate">{formatPlayerName(match.player2)}</span>
                                                                                {p2Absent && <TagAbsent />}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-xs text-gray-500">
                                                                            <RestrictionDisplay restrictions={restrictions} playerId={match.player2_id} />
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {formatTime(match.match_time)}
                                                                        </TableCell>
                                                                        <TableCell className="truncate text-center">
                                                                            {match.court_number || "-"}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {editMode ? (
                                                                                <ScoreEditor
                                                                                    matchId={match.id}
                                                                                    scoreValue={pendingScores?.get(match.id)}
                                                                                    onScoreChange={onScoreChange}
                                                                                />
                                                                            ) : (
                                                                                <ScoreDisplay match={match} />
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}

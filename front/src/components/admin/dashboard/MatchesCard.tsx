import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar03Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon } from "hugeicons-react"
import { useMatchesByDay, type DayMatch, type MatchDay } from "@/hooks/useMatchesByDay"
import { isMatchUnplayed } from "@/lib/matchScore"

const SCORE_OPTIONS = [
    { value: "", label: "Score…" },
    { value: "3-0", label: "3 – 0" },
    { value: "3-1", label: "3 – 1" },
    { value: "3-2", label: "3 – 2" },
    { value: "0-3", label: "0 – 3" },
    { value: "1-3", label: "1 – 3" },
    { value: "2-3", label: "2 – 3" },
    { value: "ABS-0", label: "Abs P1" },
    { value: "0-ABS", label: "Abs P2" },
]

function formatTime(matchTime: string): string {
    const m = matchTime.match(/^(\d{2}:\d{2})/)
    return m ? m[1] : matchTime
}

/** Accorde un libellé compté : 1 match, 2 matchs. */
function pluriel(n: number, singulier: string, pluriel: string): string {
    return `${n} ${n > 1 ? pluriel : singulier}`
}

/**
 * Les trois chiffres du jour affiché.
 *
 * « Non joué » n'est pas « sans score » : un match de 23h vu à 20h attend son
 * heure, il n'est en retard de rien. Le délai vit dans `isMatchUnplayed`, une
 * seule fois pour toute l'application.
 *
 * Une absence est un résultat, pas une absence de résultat. Elle rapporte des
 * points et compte donc parmi les matchs joués, d'où deux comptes séparés.
 */
function compterLeJour(day: MatchDay | undefined) {
    const matches = day?.matches ?? []
    return {
        total: matches.length,
        nonJoues: matches.filter(m => isMatchUnplayed(m)).length,
        absences: matches.filter(m => m.score?.includes("ABS")).length,
    }
}

/**
 * Trois rôles, trois poids. Le total renseigne, d'où un gris neutre. Les
 * absences sont un fait acquis, d'où un ambre plein. Les non joués sont les
 * seuls des trois à demander une action : un contour ambre sur blanc, qui se
 * détache des deux autres sans crier.
 */
function TagsDuJour({ day }: { day: MatchDay | undefined }) {
    const { total, nonJoues, absences } = compterLeJour(day)
    if (total === 0) return null

    return (
        <span className="ml-auto flex shrink-0 items-center gap-2">
            <Badge variant="neutral" className="h-5 px-2 text-xs">
                {pluriel(total, "match", "matchs")}
            </Badge>
            {/*
              * Affiche meme a zero, a la difference des absences : c'est le
              * seul des trois qui appelle une action, et « 0 non joué » est
              * une bonne nouvelle qu'on vient chercher.
              */}
            <Badge variant="warningOutline" className="h-5 px-2 text-xs">
                {pluriel(nonJoues, "non joué", "non joués")}
            </Badge>
            {absences > 0 && (
                <Badge variant="warningSoft" className="h-5 px-2 text-xs">
                    {pluriel(absences, "absence", "absences")}
                </Badge>
            )}
        </span>
    )
}

/**
 * Ce que le sélecteur de score montre une fois fermé, et la couleur qu'il
 * porte. Trois états, trois poids : un résultat est acquis et se dit en vert ;
 * une absence est un résultat elle aussi, mais qui n'a pas été joué, d'où un
 * ambre plein ; un match en retard demande une action, d'où le seul contour
 * des trois.
 */
function etatDuScore(match: DayMatch): { libelle: string; classe: string } {
    if (match.status === "done" && match.score) {
        return match.score.includes("ABS")
            // « Abs » sur la pastille, qui fut absent dans le menu.
            ? { libelle: "Abs", classe: "border-warning-soft-border bg-warning-soft text-warning-soft-foreground" }
            : { libelle: match.score, classe: "border-success-soft-border bg-success-soft text-success-soft-foreground" }
    }

    const annonce = match.pending_score_p1 ?? match.pending_score_p2
    if (match.status === "waiting_one" && annonce) {
        return { libelle: annonce, classe: "border-warning-border bg-card text-warning-soft-foreground" }
    }

    if (isMatchUnplayed(match)) {
        return { libelle: "Non joué", classe: "border-warning-border bg-card text-warning-soft-foreground" }
    }

    return { libelle: "Score…", classe: "border-border bg-card text-muted-foreground" }
}

interface MatchesCardProps {
    roundId: string | null
    className?: string
}

export function MatchesCard({ roundId, className }: MatchesCardProps) {
    const { days, loading, initialDayIndex, resolveScore } = useMatchesByDay(roundId)
    const [dayIndex, setDayIndex] = useState(0)

    useEffect(() => {
        setDayIndex(initialDayIndex)
    }, [initialDayIndex])

    /*
     * Choisir enregistre. Il n'y a plus de bouton a confirmer, donc plus de
     * choix en attente a retenir : le score vit en base ou nulle part.
     */
    const handleValidate = useCallback(async (match: DayMatch, score: string) => {
        if (!score) return
        await resolveScore(match.id, score, match.player1_id, match.player2_id)
    }, [resolveScore])

    const currentDay = days[dayIndex]

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Calendar03Icon size={16} className="text-foreground shrink-0" />
                    <span className="font-semibold shrink-0">Matchs</span>
                    <button
                        onClick={() => setDayIndex(i => i - 1)}
                        disabled={dayIndex === 0 || days.length === 0}
                        className="p-0.5 rounded transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        aria-label="Jour précédent"
                    >
                        <ArrowLeft01Icon size={14} />
                    </button>
                    {currentDay && (
                        <>
                            <span className="text-xs text-muted-foreground font-normal truncate">
                                {currentDay.label}
                            </span>
                            {currentDay.isToday && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0 bg-primary text-primary-foreground">
                                    aujourd'hui
                                </Badge>
                            )}
                        </>
                    )}
                    <button
                        onClick={() => setDayIndex(i => i + 1)}
                        disabled={dayIndex >= days.length - 1 || days.length === 0}
                        className="p-0.5 rounded transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        aria-label="Jour suivant"
                    >
                        <ArrowRight01Icon size={14} />
                    </button>
                    <TagsDuJour day={currentDay} />
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p className="text-sm">Chargement...</p>
                    </div>
                ) : !currentDay ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Calendar03Icon size={28} className="mb-3" />
                        <p className="text-sm">Aucun match programmé</p>
                    </div>
                ) : (
                    <MatchesFeed day={currentDay} onValidate={handleValidate} />
                )}
            </CardContent>
        </Card>
    )
}

interface MatchesFeedProps {
    day: MatchDay
    onValidate: (match: DayMatch, score: string) => Promise<void>
}

function MatchesFeed({ day, onValidate }: MatchesFeedProps) {
    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full" type="auto">
                    {/* Desktop : tableau */}
                    <div className="hidden md:block overflow-hidden">
                        <Table className="table-fixed">
                            <colgroup>
                                <col className="w-[8%]" />
                                <col className="w-[9%]" />
                                <col className="w-[42%]" />
                                <col className="w-[8%]" />
                                <col className="w-[33%]" />
                            </colgroup>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-[10px] text-muted-foreground h-7">Heure</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground h-7">Boxe</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground h-7">Match</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground h-7">Terrain</TableHead>
                                    <TableHead className="text-[10px] text-muted-foreground h-7 text-right">Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {day.matches.map((match, index) => {
                                    const currentTime = formatTime(match.match_time)
                                    const nextTime = index < day.matches.length - 1
                                        ? formatTime(day.matches[index + 1].match_time)
                                        : null
                                    const previousTime = index > 0
                                        ? formatTime(day.matches[index - 1].match_time)
                                        : null
                                    return (
                                        <MatchTableRow
                                            key={match.id}
                                            match={match}
                                            isLastOfSlot={nextTime !== null && currentTime !== nextTime}
                                            isFirstOfSlot={previousTime !== currentTime}
                                            onValidate={onValidate}
                                        />
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile : cartes */}
                    <div className="md:hidden flex flex-col gap-2">
                        {day.matches.map(match => (
                            <MatchMobileCard key={match.id} match={match} onValidate={onValidate} />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

interface MatchRowProps {
    match: DayMatch
    isLastOfSlot: boolean
    isFirstOfSlot: boolean
    onValidate: (match: DayMatch, score: string) => Promise<void>
}

/** Le vainqueur se dit par la graisse, et rien d'autre. */
function Affiche({ match }: { match: DayMatch }) {
    const p1 = match.player1 ? `${match.player1.first_name} ${match.player1.last_name}` : "?"
    const p2 = match.player2 ? `${match.player2.first_name} ${match.player2.last_name}` : "?"
    return (
        <div className="flex items-center gap-1.5">
            <span className={`truncate ${match.winner_id === match.player1_id ? "font-semibold" : ""}`}>
                {p1}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">vs</span>
            <span className={`truncate ${match.winner_id === match.player2_id ? "font-semibold" : ""}`}>
                {p2}
            </span>
        </div>
    )
}

function MatchTableRow({ match, isLastOfSlot, isFirstOfSlot, onValidate }: MatchRowProps) {
    return (
        <TableRow className={isLastOfSlot ? "border-b" : "border-b-0"}>
            {/*
              * L'heure ne s'ecrit qu'en tete de creneau. Trois matchs a 19h00
              * repetaient trois fois la meme heure, et l'oeil devait comparer
              * des chiffres pour voir un groupe que le blanc montre tout seul.
              */}
            <TableCell data-cellule-heure className="text-xs font-semibold">
                {isFirstOfSlot ? formatTime(match.match_time) : ""}
            </TableCell>
            <TableCell>
                {match.group?.group_name && (
                    <Badge variant="neutral" className="text-xs px-2 py-0.5">
                        {match.group.group_name}
                    </Badge>
                )}
            </TableCell>
            <TableCell>
                <Affiche match={match} />
            </TableCell>
            {/*
              * `court_number` porte le nom du terrain, pas son numero : la
              * colonne est mal nommee. Le prefixer donnait « Terrain Terrain 1 »,
              * le defaut de `club_courts` etant deja « Terrain 1 ».
              */}
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {match.court_number ?? "-"}
            </TableCell>
            <TableCell>
                <ScoreCell match={match} onValidate={onValidate} />
            </TableCell>
        </TableRow>
    )
}

interface MatchMobileCardProps {
    match: DayMatch
    onValidate: (match: DayMatch, score: string) => Promise<void>
}

function MatchMobileCard({ match, onValidate }: MatchMobileCardProps) {
    return (
        <div className="rounded-md border p-3 text-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {formatTime(match.match_time)}
                </span>
                {match.group?.group_name && (
                    <Badge variant="neutral" className="text-xs px-2 py-0.5 shrink-0">
                        {match.group.group_name}
                    </Badge>
                )}
                {match.court_number && (
                    <span className="text-xs text-muted-foreground shrink-0">
                        {match.court_number}
                    </span>
                )}
            </div>
            <Affiche match={match} />
            <ScoreCell match={match} onValidate={onValidate} compact />
        </div>
    )
}

interface ScoreCellProps {
    match: DayMatch
    onValidate: (match: DayMatch, score: string) => Promise<void>
    compact?: boolean
}

/**
 * Un seul contrôle par rangée, quel que soit l'état du match.
 *
 * Avant, un match terminé montrait une pastille figée et un match sans score
 * montrait une pastille, un sélecteur et un bouton Valider : trois objets dans
 * une colonne d'un tiers, et deux grammaires à apprendre.
 *
 * Le sélecteur natif est posé en transparence sur la pastille, comme dans le
 * fil d'Ariane. Le clavier marche sans une ligne de code, un `fireEvent.change`
 * suffit à le tester, et sur téléphone c'est le système qui ouvre sa roulette.
 */
function ScoreCell({ match, onValidate, compact }: ScoreCellProps) {
    if (match.status === "conflict") {
        return <ConflitCell match={match} onValidate={onValidate} compact={compact} />
    }

    const { libelle, classe } = etatDuScore(match)
    const enregistre = match.score ?? ""

    /*
     * Un score déjà posé n'offre plus l'entrée vide. La remettre serait un
     * effacement, et l'effacement demande un geste explicite : dans une grille
     * où l'on parcourt vingt lignes d'un coup, une entrée vide choisie par
     * mégarde détruirait un résultat sans rien dire. Voir `MatchScoreDialog`,
     * qui porte ce geste.
     */
    const options = enregistre
        ? SCORE_OPTIONS.slice(1)
        : [{ value: "", label: libelle }, ...SCORE_OPTIONS.slice(1)]

    return (
        <div className={`flex ${compact ? "" : "justify-end"}`}>
            <span
                data-controle-score
                className={`relative inline-flex h-6 w-[84px] items-center justify-between rounded-md border px-2 text-xs font-medium ${classe}`}
            >
                <span className="truncate">{libelle}</span>
                <ArrowDown01Icon size={12} aria-hidden className="shrink-0 opacity-60" />
                <select
                    data-liste-stylee
                    aria-label={`Score pour ${match.player1?.first_name ?? "P1"} vs ${match.player2?.first_name ?? "P2"}`}
                    value={enregistre}
                    onChange={(e) => onValidate(match, e.target.value)}
                    className="absolute inset-0 w-full cursor-pointer opacity-0"
                >
                    {options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </span>
        </div>
    )
}

/**
 * Le conflit garde son traitement à part, et c'est voulu : deux joueurs ont
 * annoncé deux scores différents, et aucun contrôle unique ne peut montrer les
 * deux valeurs en même temps. L'admin tranche entre elles.
 */
function ConflitCell({ match, onValidate, compact }: ScoreCellProps) {
    const alignClass = compact ? "" : "justify-end"
    return (
        <div className="flex flex-col gap-1">
            <div className={`flex ${alignClass}`}>
                <Badge variant="unpaid" className="text-[10px] px-1.5 py-0">Conflit</Badge>
            </div>
            {([["P1", match.pending_score_p1], ["P2", match.pending_score_p2]] as const).map(
                ([qui, annonce]) => annonce && (
                    <div key={qui} className="flex items-center gap-1 justify-end">
                        <span className="text-muted-foreground text-[10px]">{qui} :</span>
                        <span className="font-mono font-medium text-[11px]">{annonce}</span>
                        <button
                            onClick={() => onValidate(match, annonce)}
                            aria-label="Valider"
                            className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors whitespace-nowrap"
                        >
                            Valider
                        </button>
                    </div>
                ),
            )}
        </div>
    )
}

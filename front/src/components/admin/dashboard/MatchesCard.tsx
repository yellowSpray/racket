import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar03Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon } from "hugeicons-react"
import { useMatchesByDay, type DayMatch, type MatchDay } from "@/hooks/useMatchesByDay"
import { isMatchUnplayed } from "@/lib/matchScore"
import { BLOC_DEFILANT } from "@/lib/scrollArea"
import { TUILE, TUILE_RETRAIT } from "./tuile"

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

/** La date d'une carte étroite : « sam. 18 avr. », là où une carte large écrit « samedi 18 avril ». */
function dateCourte(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
        weekday: "short", day: "numeric", month: "short",
    })
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
        /*
         * Dans une carte etroite les tags prennent une ligne a eux, calee a gauche sous
         * le titre. Ils passaient deja a la ligne faute de place, mais pousses
         * a droite par leur `ml-auto` ils flottaient loin de tout.
         */
        <span data-tags-du-jour className="flex shrink-0 basis-full items-center gap-2 @min-[39rem]/tuile:ml-auto @min-[39rem]/tuile:basis-auto">
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

    /*
     * LA CARTE SUIT SA PROPRE LARGEUR, PAS CELLE DE L'ECRAN.
     *
     * A 1024 px le dashboard passe en deux colonnes : la barre laterale se
     * deploie, la colonne de droite prend ses 360 px, et la carte tombe d'un
     * coup de 905 a 377 px. Une regle sur l'ecran ne pouvait pas le voir. Le
     * tableau y gardait ses pourcentages, 28 px pour un badge de boxe de 49,
     * et tout se chevauchait jusque vers 1400.
     *
     * Sous 624 px de carte (39rem), la liste par creneau et le titre sur deux
     * lignes ; au-dessus, le tableau et le titre sur une. Mesure : la ligne de
     * titre tient sur une ligne a partir de 624, le tableau a colonnes fixes
     * aussi. Un seul seuil pour les deux, donc une seule bascule a expliquer.
     *
     * Nomme `tuile` : `CardHeader` est lui-meme un conteneur, et une requete
     * sans nom interrogerait le plus proche, donc lui, pour le titre.
     */
    return (
        <Card className={`@container/tuile ${TUILE} ${className ?? ""}`}>
            <CardHeader className={TUILE_RETRAIT}>
                {/*
                  * `flex-wrap` : cette ligne porte le titre, la navigation de
                  * jour, la date et les trois tags, tous insecables sauf la
                  * date. Sa largeur minimale est de 488 px, donc elle faisait
                  * deborder la page de 113 px sur un telephone de 375. Les tags
                  * passent dessous quand la place manque.
                  */}
                <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-3 text-sm @min-[39rem]/tuile:gap-y-1">
                    <Calendar03Icon size={16} className="text-foreground shrink-0" />
                    <span className="font-semibold shrink-0">Matchs</span>
                    <button
                        onClick={() => setDayIndex(i => i - 1)}
                        disabled={dayIndex === 0 || days.length === 0}
                        className="ml-auto p-0.5 rounded transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed shrink-0 @min-[39rem]/tuile:ml-0"
                        aria-label="Jour précédent"
                    >
                        <ArrowLeft01Icon size={14} />
                    </button>
                    {currentDay && (
                        <>
                            <span className="hidden text-xs text-muted-foreground font-normal truncate @min-[39rem]/tuile:inline">
                                {currentDay.label}
                            </span>
                            {/*
                              * Carte etroite : « aujourd'hui » remplace la date au
                              * lieu de s'y ajouter : les deux ensemble faisaient
                              * passer la ligne du titre a deux.
                              */}
                            {!currentDay.isToday && (
                                <span className="text-xs text-muted-foreground font-normal @min-[39rem]/tuile:hidden">
                                    {dateCourte(currentDay.date)}
                                </span>
                            )}
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
            <CardContent className={`flex-1 min-h-0 ${TUILE_RETRAIT}`}>
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
                <ScrollArea className={`h-full ${BLOC_DEFILANT}`} type="auto">
                    {/* Carte large : le tableau. */}
                    <div data-tableau-matchs className="hidden @min-[39rem]/tuile:block overflow-hidden">
                        <Table className="table-fixed">
                            {/*
                              * Des largeurs fixes pour ce qui a une taille fixe :
                              * une heure, un badge, un nom de terrain, le
                              * controle de score de 84 px. En pourcentages, la
                              * colonne des boxes descendait a 28 px pour un
                              * badge de 49. Seul le match s'etire.
                              */}
                            <colgroup>
                                <col className="w-14" />
                                <col className="w-[72px]" />
                                <col />
                                <col className="w-20" />
                                <col className="w-[100px]" />
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

                    <ListeTelephone day={day} onValidate={onValidate} />
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

/**
 * La liste d'une carte étroite : le téléphone, et le bureau de 1024 à ~1270 px,
 * où la carte ne fait plus que 377 à 620 px à côté de la colonne de droite.
 *
 * Elle ne met plus de cartes dans la carte. Le double cadre mangeait la
 * largeur, les noms se coupaient, le score prenait une ligne à lui et l'on ne
 * voyait que deux matchs et demi à 320 px. Elle reprend la grammaire du
 * tableau de bureau : l'heure une seule fois, en intertitre de créneau, et un
 * filet entre deux rangées plutôt qu'un cadre autour de chacune.
 */
function ListeTelephone({ day, onValidate }: { day: MatchDay; onValidate: (match: DayMatch, score: string) => Promise<void> }) {
    const creneaux: { heure: string; matches: DayMatch[] }[] = []
    for (const match of day.matches) {
        const heure = formatTime(match.match_time)
        const dernier = creneaux[creneaux.length - 1]
        if (dernier?.heure === heure) dernier.matches.push(match)
        else creneaux.push({ heure, matches: [match] })
    }

    return (
        <div data-liste-telephone className="@min-[39rem]/tuile:hidden">
            {creneaux.map(({ heure, matches }) => (
                <div key={heure} data-groupe-creneau>
                    {/*
                      * Le filet de l'intertitre sépare aussi deux créneaux :
                      * la dernière rangée de chacun n'en porte donc pas. Le
                      * premier garde son retrait haut, qui le détache des tags.
                      */}
                    <div
                        data-creneau
                        className="flex items-center gap-2 pb-1 pt-3 text-xs font-semibold text-muted-foreground"
                    >
                        {heure}
                        <span aria-hidden className="h-px flex-1 bg-border" />
                    </div>
                    {matches.map((match, j) => (
                        <LigneTelephone
                            key={match.id}
                            match={match}
                            derniere={j === matches.length - 1}
                            onValidate={onValidate}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

/*
 * Les deux noms l'un sous l'autre, en entier, plutôt que côte à côte coupés
 * en « Ramiro S… vs Nicolas Debu… ». Le vainqueur se dit par la graisse,
 * comme sur le bureau. La boxe et le terrain situent le match en petit gris
 * dessous : ils n'annoncent rien.
 */
function LigneTelephone({ match, derniere, onValidate }: {
    match: DayMatch
    derniere: boolean
    onValidate: (match: DayMatch, score: string) => Promise<void>
}) {
    const joueurs = [
        { id: match.player1_id, p: match.player1 },
        { id: match.player2_id, p: match.player2 },
    ]
    const situation = [match.group?.group_name, match.court_number].filter(Boolean).join(" · ")

    return (
        <div data-ligne-match className={`flex items-center gap-3 py-2.5 ${derniere ? "" : "border-b border-border"}`}>
            <div className="min-w-0 flex-1 text-sm leading-5">
                {joueurs.map(({ id, p }) => (
                    <span
                        key={id}
                        data-joueur
                        className={`block truncate ${match.winner_id === id ? "font-semibold" : ""}`}
                    >
                        {p ? `${p.first_name} ${p.last_name}` : "?"}
                    </span>
                ))}
                {situation && (
                    <span data-situation className="block truncate text-xs text-muted-foreground">
                        {situation}
                    </span>
                )}
            </div>
            <div className="shrink-0">
                <ScoreCell match={match} onValidate={onValidate} />
            </div>
        </div>
    )
}

interface ScoreCellProps {
    match: DayMatch
    onValidate: (match: DayMatch, score: string) => Promise<void>
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
function ScoreCell({ match, onValidate }: ScoreCellProps) {
    if (match.status === "conflict") {
        return <ConflitCell match={match} onValidate={onValidate} />
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
        <div className="flex justify-end">
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
function ConflitCell({ match, onValidate }: ScoreCellProps) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-end">
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

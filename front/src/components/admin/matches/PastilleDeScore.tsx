import type { Match } from "@/types/match"

/**
 * Le score d'un match, en pastille.
 *
 * La grammaire de la tuile des matchs du tableau de bord : un fond plein dit
 * qu'un résultat est acquis, un contour qu'on attend encore. Elle sert aux
 * deux listes de l'écran des matchs, par terrain et par boxe, qui montrent la
 * même chose et n'ont aucune raison de la dire autrement.
 *
 * Un abandon garde son ambre : c'est un résultat, mais pas un score.
 */
export function PastilleDeScore({ match }: { match: Match }) {
    const acquis = !!match.score

    const texte = !match.score
        ? "-"
        : match.score === "WO"
            ? "WO"
            : match.score.includes("ABS")
                ? "Abs"
                : match.score

    const couleurs = !acquis
        ? "border-border bg-card text-muted-foreground"
        : match.score === "WO"
            ? "border-warning-soft-border bg-warning-soft text-warning-soft-foreground"
            : "border-success-soft-border bg-success-soft text-success-soft-foreground"

    return (
        <span
            data-pastille-score
            className={`inline-flex h-8 min-w-14 shrink-0 items-center justify-center rounded-full border px-3 text-sm font-semibold tabular-nums ${couleurs}`}
        >
            {texte}
        </span>
    )
}

import type { ScorePointsEntry } from "@/types/settings"

/**
 * Resolution des regles de pointage et de promotion.
 *
 * Deux niveaux coexistent en base : l'evenement (`event_scoring_rules`,
 * `event_promotion_rules`) et le club (`scoring_rules`, `promotion_rules`).
 * Le niveau evenement l'emporte, le club sert de defaut, et le code fournit
 * un dernier recours si aucun des deux n'est renseigne.
 *
 * La resolution se fait table par table et non champ par champ : si un
 * evenement porte un bareme, ce bareme s'applique entierement. Melanger des
 * lignes venues de deux niveaux donnerait un bareme que personne n'a ecrit.
 */

/** D'ou vient la regle finalement appliquee. */
export type RulesOrigin = "event" | "club" | "default"

/** Bareme minimal : ce dont le moteur de classement a besoin, rien de plus. */
export interface ScoringSource {
    score_points: ScorePointsEntry[]
}

/** Montees et descentes : ce dont le moteur de promotion a besoin. */
export interface PromotionSource {
    promoted_count: number
    relegated_count: number
}

export interface EffectiveScoringRules extends ScoringSource {
    origin: RulesOrigin
}

export interface EffectivePromotionRules extends PromotionSource {
    origin: RulesOrigin
}

export interface EffectiveRules {
    scoring: EffectiveScoringRules
    promotion: EffectivePromotionRules
}

export interface RuleSources {
    eventScoring: ScoringSource | null | undefined
    eventPromotion: PromotionSource | null | undefined
    clubScoring: ScoringSource | null | undefined
    clubPromotion: PromotionSource | null | undefined
}

/** Bareme applique si ni l'evenement ni le club n'en definit un. */
export const DEFAULT_SCORE_POINTS: readonly ScorePointsEntry[] = [
    { score: "3-0", winner_points: 5, loser_points: 0 },
    { score: "3-1", winner_points: 4, loser_points: 1 },
    { score: "3-2", winner_points: 3, loser_points: 2 },
    { score: "ABS", winner_points: 3, loser_points: -1 },
]

/** Un monte, un descendu : le format de box le plus courant. */
export const DEFAULT_PROMOTION: Readonly<PromotionSource> = {
    promoted_count: 1,
    relegated_count: 1,
}

/**
 * Une ligne de bareme vide ne peut pas s'appliquer : aucun score ne
 * rapporterait de point. On la traite comme absente.
 */
function hasPoints(source: ScoringSource | null | undefined): source is ScoringSource {
    return !!source && Array.isArray(source.score_points) && source.score_points.length > 0
}

/**
 * Zero monte est un reglage volontaire, pas une absence de reglage : seule
 * l'absence de ligne, ou un compte non numerique, fait passer au niveau suivant.
 */
function hasCounts(source: PromotionSource | null | undefined): source is PromotionSource {
    return (
        !!source &&
        Number.isFinite(source.promoted_count) &&
        Number.isFinite(source.relegated_count)
    )
}

export function resolveScoringRules(
    event: ScoringSource | null | undefined,
    club: ScoringSource | null | undefined,
): EffectiveScoringRules {
    if (hasPoints(event)) return { score_points: event.score_points, origin: "event" }
    if (hasPoints(club)) return { score_points: club.score_points, origin: "club" }
    // Copie : le tableau par defaut est partage, un appelant ne doit pas
    // pouvoir le modifier pour tous les autres.
    return { score_points: DEFAULT_SCORE_POINTS.map(entry => ({ ...entry })), origin: "default" }
}

export function resolvePromotionRules(
    event: PromotionSource | null | undefined,
    club: PromotionSource | null | undefined,
): EffectivePromotionRules {
    if (hasCounts(event)) {
        return {
            promoted_count: event.promoted_count,
            relegated_count: event.relegated_count,
            origin: "event",
        }
    }
    if (hasCounts(club)) {
        return {
            promoted_count: club.promoted_count,
            relegated_count: club.relegated_count,
            origin: "club",
        }
    }
    return { ...DEFAULT_PROMOTION, origin: "default" }
}

export function resolveRules(sources: RuleSources): EffectiveRules {
    return {
        scoring: resolveScoringRules(sources.eventScoring, sources.clubScoring),
        promotion: resolvePromotionRules(sources.eventPromotion, sources.clubPromotion),
    }
}

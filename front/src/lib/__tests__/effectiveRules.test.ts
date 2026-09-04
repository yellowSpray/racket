import { describe, it, expect } from "vitest"
import {
    DEFAULT_SCORE_POINTS,
    DEFAULT_PROMOTION,
    resolveScoringRules,
    resolvePromotionRules,
    resolveRules,
} from "../effectiveRules"
import type { ScorePointsEntry } from "@/types/settings"

const CLUB_POINTS: ScorePointsEntry[] = [
    { score: "3-0", winner_points: 5, loser_points: 0 },
    { score: "3-1", winner_points: 4, loser_points: 1 },
    { score: "3-2", winner_points: 3, loser_points: 2 },
    { score: "ABS", winner_points: 3, loser_points: -1 },
]

const EVENT_POINTS: ScorePointsEntry[] = [
    { score: "3-0", winner_points: 10, loser_points: 0 },
    { score: "3-1", winner_points: 8, loser_points: 2 },
]

describe("resolveScoringRules", () => {
    it("prend le bareme de l'evenement quand il existe", () => {
        const r = resolveScoringRules(
            { score_points: EVENT_POINTS },
            { score_points: CLUB_POINTS },
        )

        expect(r.score_points).toEqual(EVENT_POINTS)
        expect(r.origin).toBe("event")
    })

    it("retombe sur le club quand l'evenement n'a pas de bareme", () => {
        const r = resolveScoringRules(null, { score_points: CLUB_POINTS })

        expect(r.score_points).toEqual(CLUB_POINTS)
        expect(r.origin).toBe("club")
    })

    it("retombe sur les valeurs par defaut quand les deux niveaux sont vides", () => {
        const r = resolveScoringRules(null, null)

        expect(r.score_points).toEqual(DEFAULT_SCORE_POINTS)
        expect(r.origin).toBe("default")
    })

    it("ignore une ligne dont le bareme est vide", () => {
        // Une ligne existe mais ne contient aucune entree : elle ne peut pas
        // servir de bareme, sinon aucun match ne rapporterait de point.
        const r = resolveScoringRules({ score_points: [] }, { score_points: CLUB_POINTS })

        expect(r.score_points).toEqual(CLUB_POINTS)
        expect(r.origin).toBe("club")
    })

    it("ne rend jamais la reference du tableau par defaut", () => {
        const a = resolveScoringRules(null, null)
        const b = resolveScoringRules(null, null)

        a.score_points.push({ score: "5-0", winner_points: 99, loser_points: 0 })

        expect(b.score_points).toEqual(DEFAULT_SCORE_POINTS)
        expect(DEFAULT_SCORE_POINTS).toHaveLength(4)
    })
})

describe("resolvePromotionRules", () => {
    it("prend les montees et descentes de l'evenement quand elles existent", () => {
        const r = resolvePromotionRules(
            { promoted_count: 2, relegated_count: 3 },
            { promoted_count: 1, relegated_count: 1 },
        )

        expect(r).toEqual({ promoted_count: 2, relegated_count: 3, origin: "event" })
    })

    it("retombe sur le club quand l'evenement n'a rien", () => {
        const r = resolvePromotionRules(null, { promoted_count: 2, relegated_count: 2 })

        expect(r).toEqual({ promoted_count: 2, relegated_count: 2, origin: "club" })
    })

    it("retombe sur les valeurs par defaut quand les deux niveaux sont vides", () => {
        const r = resolvePromotionRules(null, null)

        expect(r).toEqual({ ...DEFAULT_PROMOTION, origin: "default" })
    })

    it("respecte un zero, qui veut dire aucune montee", () => {
        // 0 est un reglage volontaire, pas une absence de reglage.
        const r = resolvePromotionRules(
            { promoted_count: 0, relegated_count: 0 },
            { promoted_count: 1, relegated_count: 1 },
        )

        expect(r).toEqual({ promoted_count: 0, relegated_count: 0, origin: "event" })
    })
})

describe("resolveRules", () => {
    it("resout chaque table de son cote", () => {
        // L'evenement porte un bareme mais pas de regle de promotion : les deux
        // ne descendent pas du meme niveau, et c'est normal.
        const r = resolveRules({
            eventScoring: { score_points: EVENT_POINTS },
            eventPromotion: null,
            clubScoring: { score_points: CLUB_POINTS },
            clubPromotion: { promoted_count: 2, relegated_count: 2 },
        })

        expect(r.scoring.origin).toBe("event")
        expect(r.promotion.origin).toBe("club")
        expect(r.scoring.score_points).toEqual(EVENT_POINTS)
        expect(r.promotion.promoted_count).toBe(2)
    })

    it("resout les deux tables sur les valeurs par defaut quand rien n'existe", () => {
        const r = resolveRules({
            eventScoring: null,
            eventPromotion: null,
            clubScoring: null,
            clubPromotion: null,
        })

        expect(r.scoring.origin).toBe("default")
        expect(r.promotion.origin).toBe("default")
    })
})

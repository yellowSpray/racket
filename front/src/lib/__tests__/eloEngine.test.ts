import { describe, it, expect } from "vitest"
import {
    calculateExpectedScore,
    getMarginMultiplier,
    calculateEloChange,
    computeEloUpdates,
    DEFAULT_K_FACTOR,
    type EloMatchResult,
} from "../eloEngine"

describe("calculateExpectedScore", () => {
    it("returns 0.5 for equal ratings", () => {
        expect(calculateExpectedScore(1500, 1500)).toBeCloseTo(0.5)
    })

    it("returns higher probability for higher-rated player", () => {
        const expected = calculateExpectedScore(2000, 1500)
        expect(expected).toBeGreaterThan(0.9)
        expect(expected).toBeLessThan(1.0)
    })

    it("returns lower probability for lower-rated player", () => {
        const expected = calculateExpectedScore(1500, 2000)
        expect(expected).toBeGreaterThan(0.0)
        expect(expected).toBeLessThan(0.1)
    })

    it("is symmetric: E_A + E_B = 1", () => {
        const eA = calculateExpectedScore(1800, 1400)
        const eB = calculateExpectedScore(1400, 1800)
        expect(eA + eB).toBeCloseTo(1.0)
    })
})

describe("getMarginMultiplier", () => {
    it("returns 1.25 for 3-0", () => {
        expect(getMarginMultiplier("3-0")).toBe(1.25)
    })

    it("returns 1.10 for 3-1", () => {
        expect(getMarginMultiplier("3-1")).toBe(1.10)
    })

    it("returns 1.00 for 3-2", () => {
        expect(getMarginMultiplier("3-2")).toBe(1.00)
    })

    it("returns 1.25 for reversed 0-3", () => {
        expect(getMarginMultiplier("0-3")).toBe(1.25)
    })

    it("returns 1.10 for reversed 1-3", () => {
        expect(getMarginMultiplier("1-3")).toBe(1.10)
    })

    it("returns 0 for ABS", () => {
        expect(getMarginMultiplier("ABS")).toBe(0)
    })

    it("returns 0 for ABS-0", () => {
        expect(getMarginMultiplier("ABS-0")).toBe(0)
    })

    it("returns 0 for 0-ABS", () => {
        expect(getMarginMultiplier("0-ABS")).toBe(0)
    })

    it("returns 1.00 for null", () => {
        expect(getMarginMultiplier(null)).toBe(1.00)
    })

    it("returns 1.00 for empty string", () => {
        expect(getMarginMultiplier("")).toBe(1.00)
    })

    it("returns 1.00 for WO", () => {
        expect(getMarginMultiplier("WO")).toBe(1.00)
    })
})

describe("calculateEloChange", () => {
    it("returns symmetric deltas (winnerDelta = -loserDelta)", () => {
        const { winnerDelta, loserDelta } = calculateEloChange(1500, 1500, "3-2")
        expect(winnerDelta).toBe(-loserDelta)
    })

    it("equal ratings, 3-2: winner gets +16", () => {
        // K=32, multiplier=1.0, E=0.5 → delta = 32 * 1.0 * (1 - 0.5) = 16
        const { winnerDelta } = calculateEloChange(1500, 1500, "3-2")
        expect(winnerDelta).toBe(16)
    })

    it("equal ratings, 3-0: winner gets +20", () => {
        // K=32, multiplier=1.25, E=0.5 → delta = 32 * 1.25 * 0.5 = 20
        const { winnerDelta } = calculateEloChange(1500, 1500, "3-0")
        expect(winnerDelta).toBe(20)
    })

    it("equal ratings, 3-1: winner gets +18", () => {
        // K=32, multiplier=1.10, E=0.5 → delta = 32 * 1.10 * 0.5 = 17.6 → 18
        const { winnerDelta } = calculateEloChange(1500, 1500, "3-1")
        expect(winnerDelta).toBe(18)
    })

    it("upset (low beats high): winner gains more", () => {
        const { winnerDelta } = calculateEloChange(1200, 1800, "3-2")
        expect(winnerDelta).toBeGreaterThan(16)
    })

    it("expected win (high beats low): winner gains less", () => {
        const { winnerDelta } = calculateEloChange(1800, 1200, "3-2")
        expect(winnerDelta).toBeLessThan(16)
    })

    it("ABS score: zero change", () => {
        const { winnerDelta, loserDelta } = calculateEloChange(1500, 1500, "ABS")
        expect(winnerDelta).toBe(0)
        expect(loserDelta).toBe(0)
    })

    it("returns integer values", () => {
        const { winnerDelta, loserDelta } = calculateEloChange(1523, 1487, "3-1")
        expect(Number.isInteger(winnerDelta)).toBe(true)
        expect(Number.isInteger(loserDelta)).toBe(true)
    })

    it("accepts custom K-factor", () => {
        const { winnerDelta } = calculateEloChange(1500, 1500, "3-2", 64)
        // K=64, multiplier=1.0, E=0.5 → 64 * 1.0 * 0.5 = 32
        expect(winnerDelta).toBe(32)
    })
})

describe("computeEloUpdates (batch — end of event)", () => {
    it("computes new ratings for a single match", () => {
        const results: EloMatchResult[] = [
            { matchId: "m1", winnerId: "p1", loserId: "p2", score: "3-2" },
        ]
        const ratings = new Map([["p1", 1500], ["p2", 1500]])

        const updated = computeEloUpdates(results, ratings)

        expect(updated.get("p1")).toBe(1516)
        expect(updated.get("p2")).toBe(1484)
    })

    it("uses initial ratings for all matches (order-independent)", () => {
        const results: EloMatchResult[] = [
            { matchId: "m1", winnerId: "p1", loserId: "p2", score: "3-2" },
            { matchId: "m2", winnerId: "p1", loserId: "p3", score: "3-0" },
        ]
        const ratings = new Map([["p1", 1500], ["p2", 1500], ["p3", 1500]])

        const updated = computeEloUpdates(results, ratings)

        // Both deltas calculated from initial 1500, not accumulated
        // m1: K=32, mult=1.0, E=0.5 → delta=16
        // m2: K=32, mult=1.25, E=0.5 → delta=20
        // p1 total: 1500 + 16 + 20 = 1536
        expect(updated.get("p1")).toBe(1536)
        expect(updated.get("p2")).toBe(1484)
        expect(updated.get("p3")).toBe(1480)
    })

    it("is independent of match order", () => {
        const resultsA: EloMatchResult[] = [
            { matchId: "m1", winnerId: "p1", loserId: "p2", score: "3-1" },
            { matchId: "m2", winnerId: "p2", loserId: "p3", score: "3-0" },
        ]
        const resultsB: EloMatchResult[] = [
            { matchId: "m2", winnerId: "p2", loserId: "p3", score: "3-0" },
            { matchId: "m1", winnerId: "p1", loserId: "p2", score: "3-1" },
        ]
        const ratings = new Map([["p1", 1500], ["p2", 1500], ["p3", 1500]])

        const updatedA = computeEloUpdates(resultsA, ratings)
        const updatedB = computeEloUpdates(resultsB, ratings)

        expect(updatedA.get("p1")).toBe(updatedB.get("p1"))
        expect(updatedA.get("p2")).toBe(updatedB.get("p2"))
        expect(updatedA.get("p3")).toBe(updatedB.get("p3"))
    })

    it("skips players not in currentRatings", () => {
        const results: EloMatchResult[] = [
            { matchId: "m1", winnerId: "p1", loserId: "p2", score: "3-0" },
        ]
        const ratings = new Map([["p1", 1500]]) // p2 missing

        const updated = computeEloUpdates(results, ratings)

        // Match skipped because p2 not in ratings
        expect(updated.size).toBe(0)
    })

    it("returns empty map for empty results", () => {
        const ratings = new Map([["p1", 1500]])
        const updated = computeEloUpdates([], ratings)
        expect(updated.size).toBe(0)
    })

    it("ABS score has no impact on ratings", () => {
        const results: EloMatchResult[] = [
            { matchId: "m1", winnerId: "p1", loserId: "p2", score: "ABS" },
        ]
        const ratings = new Map([["p1", 1500], ["p2", 1500]])

        const updated = computeEloUpdates(results, ratings)

        // ABS multiplier = 0 → no change
        expect(updated.size).toBe(0)
    })

    it("only returns changed players", () => {
        const results: EloMatchResult[] = [
            { matchId: "m1", winnerId: "p1", loserId: "p2", score: "3-0" },
        ]
        const ratings = new Map([["p1", 1500], ["p2", 1500], ["p3", 1400]])

        const updated = computeEloUpdates(results, ratings)

        expect(updated.has("p1")).toBe(true)
        expect(updated.has("p2")).toBe(true)
        expect(updated.has("p3")).toBe(false)
    })

    it("does not mutate the input ratings map", () => {
        const results: EloMatchResult[] = [
            { matchId: "m1", winnerId: "p1", loserId: "p2", score: "3-0" },
        ]
        const ratings = new Map([["p1", 1500], ["p2", 1500]])

        computeEloUpdates(results, ratings)

        expect(ratings.get("p1")).toBe(1500)
        expect(ratings.get("p2")).toBe(1500)
    })
})

import { describe, it, expect } from "vitest"
import { parseScore, determineMatchOutcome, calculateGroupStandings } from "./rankingEngine"
import type { Match } from "@/types/match"
import type { ScoringRules } from "@/types/settings"

// --- Helpers ---

function makeMatch(overrides: Partial<Match> = {}): Match {
    return {
        id: "m1",
        group_id: "g1",
        player1_id: "p1",
        player2_id: "p2",
        match_date: "2026-03-05",
        match_time: "19:00",
        court_number: "Terrain 1",
        winner_id: null,
        score: null,
        ...overrides,
    }
}

function makeRules(overrides: Partial<ScoringRules> = {}): ScoringRules {
    return {
        id: "r1",
        club_id: "c1",
        points_win: 3,
        points_loss: 1,
        points_draw: 2,
        points_walkover_win: 3,
        points_walkover_loss: 0,
        points_absence: 0,
        ...overrides,
    }
}

const players = [
    { id: "p1", first_name: "Alice", last_name: "Martin" },
    { id: "p2", first_name: "Bob", last_name: "Dupont" },
    { id: "p3", first_name: "Charlie", last_name: "Durand" },
]

// --- parseScore ---

describe("parseScore", () => {
    it("parses simple score '3-1' — player1 wins", () => {
        const result = parseScore("3-1", "p1", "p2")
        expect(result).toEqual({ winnerId: "p1", setsPlayer1: 3, setsPlayer2: 1 })
    })

    it("parses simple score '1-3' — player2 wins", () => {
        const result = parseScore("1-3", "p1", "p2")
        expect(result).toEqual({ winnerId: "p2", setsPlayer1: 1, setsPlayer2: 3 })
    })

    it("parses tied score '2-2' — no winner", () => {
        const result = parseScore("2-2", "p1", "p2")
        expect(result).toEqual({ winnerId: null, setsPlayer1: 2, setsPlayer2: 2 })
    })

    it("returns null for 'WO'", () => {
        const result = parseScore("WO", "p1", "p2")
        expect(result).toBeNull()
    })

    it("returns null for empty string", () => {
        const result = parseScore("", "p1", "p2")
        expect(result).toBeNull()
    })

    it("returns null for null", () => {
        const result = parseScore(null, "p1", "p2")
        expect(result).toBeNull()
    })

    it("parses multi-set score '15-12 15-8' — player1 wins 2-0", () => {
        const result = parseScore("15-12 15-8", "p1", "p2")
        expect(result).toEqual({ winnerId: "p1", setsPlayer1: 2, setsPlayer2: 0 })
    })

    it("parses multi-set score '15-12 8-15 15-10' — player1 wins 2-1", () => {
        const result = parseScore("15-12 8-15 15-10", "p1", "p2")
        expect(result).toEqual({ winnerId: "p1", setsPlayer1: 2, setsPlayer2: 1 })
    })

    it("parses multi-set score '8-15 15-12 10-15' — player2 wins 2-1", () => {
        const result = parseScore("8-15 15-12 10-15", "p1", "p2")
        expect(result).toEqual({ winnerId: "p2", setsPlayer1: 1, setsPlayer2: 2 })
    })

    it("parses 'ABS-0' — player1 absent, player2 wins", () => {
        const result = parseScore("ABS-0", "p1", "p2")
        expect(result).toEqual({ winnerId: "p2", setsPlayer1: 0, setsPlayer2: 0 })
    })

    it("parses '0-ABS' — player2 absent, player1 wins", () => {
        const result = parseScore("0-ABS", "p1", "p2")
        expect(result).toEqual({ winnerId: "p1", setsPlayer1: 0, setsPlayer2: 0 })
    })
})

// --- determineMatchOutcome ---

describe("determineMatchOutcome", () => {
    it("returns 'win' for the winner of a normal match", () => {
        const match = makeMatch({ winner_id: "p1", score: "3-1" })
        expect(determineMatchOutcome(match, "p1")).toBe("win")
    })

    it("returns 'loss' for the loser of a normal match", () => {
        const match = makeMatch({ winner_id: "p1", score: "3-1" })
        expect(determineMatchOutcome(match, "p2")).toBe("loss")
    })

    it("returns 'walkover_win' for the winner of a WO match", () => {
        const match = makeMatch({ winner_id: "p1", score: "WO" })
        expect(determineMatchOutcome(match, "p1")).toBe("walkover_win")
    })

    it("returns 'walkover_loss' for the loser of a WO match", () => {
        const match = makeMatch({ winner_id: "p1", score: "WO" })
        expect(determineMatchOutcome(match, "p2")).toBe("walkover_loss")
    })

    it("returns 'walkover_win' for the winner when opponent is absent", () => {
        const match = makeMatch({ winner_id: "p1", score: "0-ABS" })
        expect(determineMatchOutcome(match, "p1")).toBe("walkover_win")
    })

    it("returns 'absence' for the absent player", () => {
        const match = makeMatch({ winner_id: "p1", score: "0-ABS" })
        expect(determineMatchOutcome(match, "p2")).toBe("absence")
    })

    it("returns null for an unplayed match (no winner, no score)", () => {
        const match = makeMatch({ winner_id: null, score: null })
        expect(determineMatchOutcome(match, "p1")).toBeNull()
    })

    it("returns null for a player not in the match", () => {
        const match = makeMatch({ winner_id: "p1", score: "3-1" })
        expect(determineMatchOutcome(match, "p99")).toBeNull()
    })
})

// --- calculateGroupStandings ---

describe("calculateGroupStandings", () => {
    const rules = makeRules()

    it("returns empty standings for no matches", () => {
        const result = calculateGroupStandings([], "g1", "Groupe A", players, rules)
        expect(result.groupId).toBe("g1")
        expect(result.groupName).toBe("Groupe A")
        expect(result.standings).toHaveLength(3)
        result.standings.forEach(s => {
            expect(s.played).toBe(0)
            expect(s.points).toBe(0)
            expect(s.wins).toBe(0)
            expect(s.losses).toBe(0)
        })
    })

    it("calculates correct points for simple win/loss", () => {
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "3-1" }),
            makeMatch({ id: "m2", player1_id: "p1", player2_id: "p3", winner_id: "p1", score: "3-0" }),
            makeMatch({ id: "m3", player1_id: "p2", player2_id: "p3", winner_id: "p3", score: "1-3" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players, rules)

        // Alice: 2 wins = 6 pts, Charlie: 1 win 1 loss = 4 pts, Bob: 2 losses = 2 pts
        const alice = result.standings.find(s => s.playerId === "p1")!
        const bob = result.standings.find(s => s.playerId === "p2")!
        const charlie = result.standings.find(s => s.playerId === "p3")!

        expect(alice.wins).toBe(2)
        expect(alice.losses).toBe(0)
        expect(alice.points).toBe(6)  // 2 * 3

        expect(bob.wins).toBe(0)
        expect(bob.losses).toBe(2)
        expect(bob.points).toBe(2)  // 2 * 1

        expect(charlie.wins).toBe(1)
        expect(charlie.losses).toBe(1)
        expect(charlie.points).toBe(4)  // 1*3 + 1*1
    })

    it("ranks players by points descending", () => {
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "3-1" }),
            makeMatch({ id: "m2", player1_id: "p1", player2_id: "p3", winner_id: "p1", score: "3-0" }),
            makeMatch({ id: "m3", player1_id: "p2", player2_id: "p3", winner_id: "p3", score: "1-3" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players, rules)
        expect(result.standings[0].playerId).toBe("p1")  // 6 pts
        expect(result.standings[1].playerId).toBe("p3")  // 4 pts
        expect(result.standings[2].playerId).toBe("p2")  // 2 pts

        expect(result.standings[0].rank).toBe(1)
        expect(result.standings[1].rank).toBe(2)
        expect(result.standings[2].rank).toBe(3)
    })

    it("handles absences correctly (ABS score)", () => {
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p2", score: "ABS-0" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players.slice(0, 2), rules)
        const alice = result.standings.find(s => s.playerId === "p1")!
        const bob = result.standings.find(s => s.playerId === "p2")!

        // Alice absent: gets points_absence (0)
        expect(alice.points).toBe(0)
        // Bob wins by absence: gets points_walkover_win (3)
        expect(bob.walkoversWon).toBe(1)
        expect(bob.points).toBe(3)
    })

    it("handles walkovers correctly", () => {
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "WO" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players.slice(0, 2), rules)
        const alice = result.standings.find(s => s.playerId === "p1")!
        const bob = result.standings.find(s => s.playerId === "p2")!

        expect(alice.walkoversWon).toBe(1)
        expect(alice.points).toBe(3)  // walkover_win = 3

        expect(bob.walkoversLost).toBe(1)
        expect(bob.points).toBe(0)  // walkover_loss = 0
    })

    it("breaks ties by head-to-head when 2 players are tied", () => {
        // Alice and Bob: 1 win each, 4 pts each. Alice beat Bob directly.
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "3-1" }),
            makeMatch({ id: "m2", player1_id: "p1", player2_id: "p3", winner_id: "p3", score: "1-3" }),
            makeMatch({ id: "m3", player1_id: "p2", player2_id: "p3", winner_id: "p3", score: "1-3" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players, rules)
        // Charlie: 6 pts. Alice and Bob: 4 pts each, same set diff (+2 and +2)
        // but wait: Alice: setsWon 3+1=4, setsLost 1+3=4, diff=0
        //           Bob:   setsWon 1+1=2, setsLost 3+3=6, diff=-4
        // Alice > Bob by set diff
        expect(result.standings[0].playerId).toBe("p3")  // 6 pts
        expect(result.standings[1].playerId).toBe("p1")  // 4 pts, diff 0
        expect(result.standings[2].playerId).toBe("p2")  // 4 pts, diff -4
    })

    it("falls back to alphabetical when h2h is circular and set diff is equal", () => {
        // A beats B, B beats C, C beats A — all same score 3-1
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "3-1" }),
            makeMatch({ id: "m2", player1_id: "p2", player2_id: "p3", winner_id: "p2", score: "3-1" }),
            makeMatch({ id: "m3", player1_id: "p3", player2_id: "p1", winner_id: "p3", score: "3-1" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players, rules)
        // All 4 pts, all set diff = +2 (3+1=4 won, 1+1=2 lost... wait)
        // Alice: won 3(vsB), lost 1(vsC) → setsWon=3, setsLost=1 (only from p1 matches? no)
        // Actually: Alice vsB: 3-1 (player1), Alice vsC: lost so C scored 3-1
        //   Alice setsWon: 3 (vs B as p1) + 1 (vs C as p2, score 3-1 means p3 won 3, p1 got 1)
        //   Alice setsLost: 1 (vs B) + 3 (vs C)
        //   diff = 4-4 = 0
        // Same for all → alphabetical
        result.standings.forEach(s => expect(s.points).toBe(4))
        expect(result.standings[0].playerName).toBe("Alice Martin")
        expect(result.standings[1].playerName).toBe("Bob Dupont")
        expect(result.standings[2].playerName).toBe("Charlie Durand")
    })

    it("breaks ties by set difference when head-to-head is equal", () => {
        // A beats B 3-0 (dominant), B beats C 3-2 (tight), C beats A 3-2 (tight)
        // All 4 pts. Set diff: A = (3+2)-(0+3) = +2, B = (3+2)-(0+3) = -1+1=...
        // Let's compute: A sets won: 3(vs B) + 2(vs C) = 5, lost: 0+3 = 3, diff = +2
        //                B sets won: 0(vs A) + 3(vs C) = 3, lost: 3+2 = 5, diff = -2
        //                C sets won: 3(vs A) + 2(vs B) = 5, lost: 2+3 = 5, diff = 0
        // Order: A(+2), C(0), B(-2)
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "3-0" }),
            makeMatch({ id: "m2", player1_id: "p2", player2_id: "p3", winner_id: "p2", score: "3-2" }),
            makeMatch({ id: "m3", player1_id: "p3", player2_id: "p1", winner_id: "p3", score: "3-2" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players, rules)
        expect(result.standings[0].playerId).toBe("p1")  // diff +2
        expect(result.standings[1].playerId).toBe("p3")  // diff 0
        expect(result.standings[2].playerId).toBe("p2")  // diff -2
    })

    it("includes all players even those with 0 matches played", () => {
        const fourPlayers = [...players, { id: "p4", first_name: "Diana", last_name: "Petit" }]
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "3-1" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", fourPlayers, rules)
        expect(result.standings).toHaveLength(4)
        const diana = result.standings.find(s => s.playerId === "p4")!
        expect(diana.played).toBe(0)
        expect(diana.points).toBe(0)
    })

    it("ignores unplayed matches", () => {
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: null, score: null }),
            makeMatch({ id: "m2", player1_id: "p1", player2_id: "p3", winner_id: "p1", score: "3-1" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players, rules)
        const alice = result.standings.find(s => s.playerId === "p1")!
        expect(alice.played).toBe(1)
        expect(alice.wins).toBe(1)
        expect(alice.points).toBe(3)
    })

    it("uses custom scoring rules", () => {
        const customRules = makeRules({ points_win: 5, points_loss: 2 })
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "3-1" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players.slice(0, 2), customRules)
        const alice = result.standings.find(s => s.playerId === "p1")!
        const bob = result.standings.find(s => s.playerId === "p2")!

        expect(alice.points).toBe(5)
        expect(bob.points).toBe(2)
    })

    it("assigns sequential ranks starting from 1", () => {
        const matches = [
            makeMatch({ id: "m1", player1_id: "p1", player2_id: "p2", winner_id: "p1", score: "3-1" }),
            makeMatch({ id: "m2", player1_id: "p1", player2_id: "p3", winner_id: "p1", score: "3-0" }),
            makeMatch({ id: "m3", player1_id: "p2", player2_id: "p3", winner_id: "p3", score: "1-3" }),
        ]

        const result = calculateGroupStandings(matches, "g1", "Groupe A", players, rules)
        expect(result.standings.map(s => s.rank)).toEqual([1, 2, 3])
    })
})

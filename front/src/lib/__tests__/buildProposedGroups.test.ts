import { describe, it, expect } from "vitest"
import { buildProposedGroups } from "../buildProposedGroups"
import type { Group } from "@/types/draw"
import type { GroupStandings, PromotionResult } from "@/types/ranking"

const previousGroups: Group[] = [
    {
        id: "g1", event_id: "e1", group_name: "Box 1", max_players: 4, created_at: "",
        players: [
            { id: "p1", first_name: "Alice", last_name: "A", phone: "", power_ranking: "10" },
            { id: "p2", first_name: "Bob", last_name: "B", phone: "", power_ranking: "9" },
            { id: "p3", first_name: "Charlie", last_name: "C", phone: "", power_ranking: "8" },
            { id: "p4", first_name: "Diana", last_name: "D", phone: "", power_ranking: "7" },
        ],
    },
    {
        id: "g2", event_id: "e1", group_name: "Box 2", max_players: 4, created_at: "",
        players: [
            { id: "p5", first_name: "Eve", last_name: "E", phone: "", power_ranking: "6" },
            { id: "p6", first_name: "Frank", last_name: "F", phone: "", power_ranking: "5" },
            { id: "p7", first_name: "Grace", last_name: "G", phone: "", power_ranking: "4" },
            { id: "p8", first_name: "Hank", last_name: "H", phone: "", power_ranking: "3" },
        ],
    },
]

const standings: GroupStandings[] = [
    {
        groupId: "g1", groupName: "Box 1",
        standings: [
            { playerId: "p1", playerName: "Alice A", rank: 1, played: 3, wins: 3, losses: 0, walkoversWon: 0, walkoversLost: 0, points: 15 },
            { playerId: "p2", playerName: "Bob B", rank: 2, played: 3, wins: 2, losses: 1, walkoversWon: 0, walkoversLost: 0, points: 12 },
            { playerId: "p3", playerName: "Charlie C", rank: 3, played: 3, wins: 1, losses: 2, walkoversWon: 0, walkoversLost: 0, points: 8 },
            { playerId: "p4", playerName: "Diana D", rank: 4, played: 3, wins: 0, losses: 3, walkoversWon: 0, walkoversLost: 0, points: 3 },
        ],
    },
    {
        groupId: "g2", groupName: "Box 2",
        standings: [
            { playerId: "p5", playerName: "Eve E", rank: 1, played: 3, wins: 3, losses: 0, walkoversWon: 0, walkoversLost: 0, points: 14 },
            { playerId: "p6", playerName: "Frank F", rank: 2, played: 3, wins: 2, losses: 1, walkoversWon: 0, walkoversLost: 0, points: 11 },
            { playerId: "p7", playerName: "Grace G", rank: 3, played: 3, wins: 1, losses: 2, walkoversWon: 0, walkoversLost: 0, points: 7 },
            { playerId: "p8", playerName: "Hank H", rank: 4, played: 3, wins: 0, losses: 3, walkoversWon: 0, walkoversLost: 0, points: 2 },
        ],
    },
]

const promotionResult: PromotionResult = {
    moves: [
        { playerId: "p4", playerName: "Diana D", fromGroupId: "g1", fromGroupName: "Box 1", toGroupId: "g2", toGroupName: "Box 2", type: "relegation" },
        { playerId: "p5", playerName: "Eve E", fromGroupId: "g2", fromGroupName: "Box 2", toGroupId: "g1", toGroupName: "Box 1", type: "promotion" },
    ],
    stayingPlayers: [
        { playerId: "p1", groupId: "g1" },
        { playerId: "p2", groupId: "g1" },
        { playerId: "p3", groupId: "g1" },
        { playerId: "p6", groupId: "g2" },
        { playerId: "p7", groupId: "g2" },
        { playerId: "p8", groupId: "g2" },
    ],
}

describe("buildProposedGroups", () => {
    it("distributes all players sorted by PR descending", () => {
        const result = buildProposedGroups(previousGroups, standings, promotionResult)

        expect(result).toHaveLength(2)

        // 8 players sorted by PR: p1(10), p2(9), p3(8), p4(7), p5(6), p6(5), p7(4), p8(3)
        // 2 groups of 4
        const box1Ids = result[0].players!.map(p => p.id)
        expect(box1Ids).toEqual(["p1", "p2", "p3", "p4"])

        const box2Ids = result[1].players!.map(p => p.id)
        expect(box2Ids).toEqual(["p5", "p6", "p7", "p8"])
    })

    it("preserves group metadata", () => {
        const result = buildProposedGroups(previousGroups, standings, promotionResult)

        expect(result[0].group_name).toBe("Box 1")
        expect(result[0].max_players).toBe(4)
        expect(result[1].group_name).toBe("Box 2")
    })

    it("uses proposed-new- prefix for group IDs", () => {
        const result = buildProposedGroups(previousGroups, standings, promotionResult)
        expect(result[0].id).toBe("proposed-new-0")
        expect(result[1].id).toBe("proposed-new-1")
    })

    it("handles empty groups", () => {
        const emptyGroups: Group[] = [
            { id: "g1", event_id: "e1", group_name: "Box 1", max_players: 4, created_at: "", players: [] },
        ]
        const result = buildProposedGroups(emptyGroups, [], { moves: [], stayingPlayers: [] })
        expect(result).toEqual([])
    })

    describe("filtrage des joueurs desinscrits (registeredPlayerIds)", () => {
        it("exclut les joueurs non inscrits au prochain evenement", () => {
            // p3 et p7 se sont desinscrits → 6 players remaining
            const registered = new Set(["p1", "p2", "p4", "p5", "p6", "p8"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered)

            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).not.toContain("p3")
            expect(allIds).not.toContain("p7")
            expect(allIds).toHaveLength(6)

            // Sorted by PR: p1(10), p2(9), p4(7), p5(6), p6(5), p8(3)
            expect(allIds).toContain("p1")
            expect(allIds).toContain("p2")
            expect(allIds).toContain("p5")
            expect(allIds).toContain("p6")
            expect(allIds).toContain("p8")
            expect(allIds).toContain("p4")
        })

        it("exclut un joueur promu qui s'est desinscrit", () => {
            // p5 (would be promoted) is unregistered
            const registered = new Set(["p1", "p2", "p3", "p4", "p6", "p7", "p8"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered)

            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).not.toContain("p5")
        })

        it("exclut un joueur relegue qui s'est desinscrit", () => {
            // p4 (would be relegated) is unregistered
            const registered = new Set(["p1", "p2", "p3", "p5", "p6", "p7", "p8"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered)

            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).not.toContain("p4")
        })

        it("garde tous les joueurs si registeredPlayerIds n'est pas fourni", () => {
            const result = buildProposedGroups(previousGroups, standings, promotionResult)

            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).toHaveLength(8)
        })
    })

    describe("placement des nouveaux joueurs par PR", () => {
        it("place un nouveau joueur fort dans le premier groupe", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new1"])
            const newPlayers = [
                { id: "new1", first_name: "Zack", last_name: "Z", phone: "", power_ranking: "9" },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers)

            // 9 players, max 4 → 3 groups of 3
            // Sorted: p1(10), new1(9), p2(9), p3(8), p4(7), p5(6), p6(5), p7(4), p8(3)
            const box1Ids = result[0].players!.map(p => p.id)
            expect(box1Ids).toContain("new1")
        })

        it("place un nouveau joueur faible dans le dernier groupe", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new2"])
            const newPlayers = [
                { id: "new2", first_name: "Yves", last_name: "Y", phone: "", power_ranking: "3" },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers, 6)

            // 9 players, max 6 → relaxed [5,4]
            // Sorted: p1(10), p2(9), p3(8), p4(7), p5(6), p6(5), p7(4), p8(3), new2(3)
            const lastGroup = result[result.length - 1]
            const lastIds = lastGroup.players!.map(p => p.id)
            expect(lastIds).toContain("new2")
        })

        it("place plusieurs nouveaux joueurs selon leur PR", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new1", "new2"])
            const newPlayers = [
                { id: "new1", first_name: "Zack", last_name: "Z", phone: "", power_ranking: "10" },
                { id: "new2", first_name: "Yves", last_name: "Y", phone: "", power_ranking: "2" },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers, 6)

            // 10 players, max 6 → [5,5]
            const box1Ids = result[0].players!.map(p => p.id)
            const box2Ids = result[1].players!.map(p => p.id)
            expect(box1Ids).toContain("new1")
            expect(box2Ids).toContain("new2")
        })

        it("place un joueur sans power_ranking dans le dernier groupe", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new3"])
            const newPlayers = [
                { id: "new3", first_name: "Will", last_name: "W", phone: "", power_ranking: "0" },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers, 6)

            const lastGroup = result[result.length - 1]
            const lastIds = lastGroup.players!.map(p => p.id)
            expect(lastIds).toContain("new3")
        })

        it("ne place rien si newPlayers est vide", () => {
            const result = buildProposedGroups(previousGroups, standings, promotionResult, undefined, [])

            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).toHaveLength(8)
        })
    })

    describe("recalcul du nombre de box (maxPlayersPerGroup)", () => {
        it("increases box count when many new players arrive", () => {
            // 8 existing + 4 new = 12 players, max 4 → picks most groups: 4 box de 3
            const allRegistered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "n1", "n2", "n3", "n4"])
            const newP = [
                { id: "n1", first_name: "N1", last_name: "X", phone: "", power_ranking: "11" },
                { id: "n2", first_name: "N2", last_name: "X", phone: "", power_ranking: "7.5" },
                { id: "n3", first_name: "N3", last_name: "X", phone: "", power_ranking: "4.5" },
                { id: "n4", first_name: "N4", last_name: "X", phone: "", power_ranking: "1" },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, allRegistered, newP, 4)

            expect(result).toHaveLength(4)
            const totalPlayers = result.reduce((sum, g) => sum + (g.players || []).length, 0)
            expect(totalPlayers).toBe(12)
        })

        it("decreases box count when many players depart", () => {
            // 4 remaining, max 4 → 1 box de 4
            const registered = new Set(["p1", "p2", "p5", "p6"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, [], 4)

            expect(result).toHaveLength(1)
            const totalPlayers = result.reduce((sum, g) => sum + (g.players || []).length, 0)
            expect(totalPlayers).toBe(4)
        })

        it("keeps same box count when player count stays compatible", () => {
            const allRegistered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, allRegistered, [], 4)

            expect(result).toHaveLength(2)
        })

        it("redistributes players by tier when box count changes", () => {
            const allRegistered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "n1", "n2", "n3", "n4"])
            const newP = [
                { id: "n1", first_name: "N1", last_name: "X", phone: "", power_ranking: "11" },
                { id: "n2", first_name: "N2", last_name: "X", phone: "", power_ranking: "7.5" },
                { id: "n3", first_name: "N3", last_name: "X", phone: "", power_ranking: "4.5" },
                { id: "n4", first_name: "N4", last_name: "X", phone: "", power_ranking: "1" },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, allRegistered, newP, 4)

            // Box 1 should have the highest PRs
            const box1PRs = result[0].players!.map(p => parseFloat(p.power_ranking) || 0)
            const box2PRs = result[1].players!.map(p => parseFloat(p.power_ranking) || 0)
            expect(Math.min(...box1PRs)).toBeGreaterThanOrEqual(Math.max(...box2PRs))
        })

        it("handles no new players and no departures", () => {
            const allRegistered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, allRegistered, [], 4)

            const totalPlayers = result.reduce((sum, g) => sum + (g.players || []).length, 0)
            expect(totalPlayers).toBe(8)
            expect(result).toHaveLength(2)
        })

        it("generates correct group names when box count changes", () => {
            const allRegistered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "n1", "n2", "n3", "n4"])
            const newP = [
                { id: "n1", first_name: "N1", last_name: "X", phone: "", power_ranking: "11" },
                { id: "n2", first_name: "N2", last_name: "X", phone: "", power_ranking: "7.5" },
                { id: "n3", first_name: "N3", last_name: "X", phone: "", power_ranking: "4.5" },
                { id: "n4", first_name: "N4", last_name: "X", phone: "", power_ranking: "1" },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, allRegistered, newP, 4)

            expect(result[0].group_name).toBe("Box 1")
            expect(result[1].group_name).toBe("Box 2")
            expect(result[2].group_name).toBe("Box 3")
            expect(result[3].group_name).toBe("Box 4")
        })

        it("picks distribution with most groups (6x5 over 5x6 for 30 players)", () => {
            // Create 5 groups of 6 = 30 players
            const groups: Group[] = Array.from({ length: 5 }, (_, gi) => ({
                id: `g${gi + 1}`, event_id: "e1", group_name: `Box ${gi + 1}`, max_players: 6, created_at: "",
                players: Array.from({ length: 6 }, (_, pi) => ({
                    id: `p${gi * 6 + pi + 1}`,
                    first_name: `Player${gi * 6 + pi + 1}`,
                    last_name: "X",
                    phone: "",
                    power_ranking: `${30 - (gi * 6 + pi)}`,
                })),
            }))
            const allIds = new Set(groups.flatMap(g => g.players!.map(p => p.id)))

            const result = buildProposedGroups(groups, [], { moves: [], stayingPlayers: [] }, allIds, [], 6)

            // 30 players, max 6: should pick 6 groups of 5 (most groups)
            expect(result).toHaveLength(6)
            for (const g of result) {
                expect(g.players).toHaveLength(5)
            }
        })
    })
})

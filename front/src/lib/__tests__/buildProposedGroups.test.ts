import { describe, it, expect } from "vitest"
import { buildProposedGroups } from "../buildProposedGroups"
import type { Group } from "@/types/draw"
import type { GroupStandings, PromotionResult } from "@/types/ranking"

const previousGroups: Group[] = [
    {
        id: "g1", event_id: "e1", group_name: "Box 1", max_players: 4, created_at: "",
        players: [
            { id: "p1", first_name: "Alice", last_name: "A", phone: "", power_ranking: 10 },
            { id: "p2", first_name: "Bob", last_name: "B", phone: "", power_ranking: 9 },
            { id: "p3", first_name: "Charlie", last_name: "C", phone: "", power_ranking: 8 },
            { id: "p4", first_name: "Diana", last_name: "D", phone: "", power_ranking: 7 },
        ],
    },
    {
        id: "g2", event_id: "e1", group_name: "Box 2", max_players: 4, created_at: "",
        players: [
            { id: "p5", first_name: "Eve", last_name: "E", phone: "", power_ranking: 6 },
            { id: "p6", first_name: "Frank", last_name: "F", phone: "", power_ranking: 5 },
            { id: "p7", first_name: "Grace", last_name: "G", phone: "", power_ranking: 4 },
            { id: "p8", first_name: "Hank", last_name: "H", phone: "", power_ranking: 3 },
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

// 1 promu, 1 relegue: p4 descend en Box 2, p5 monte en Box 1
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
    describe("promo/relegation application", () => {
        it("applies promotion: p5 moves to Box 1, p4 moves to Box 2", () => {
            const result = buildProposedGroups(previousGroups, standings, promotionResult)

            const box1Ids = result[0].players!.map(p => p.id)
            const box2Ids = result[1].players!.map(p => p.id)

            // p5 promoted to Box 1
            expect(box1Ids).toContain("p5")
            expect(box1Ids).not.toContain("p4")

            // p4 relegated to Box 2
            expect(box2Ids).toContain("p4")
            expect(box2Ids).not.toContain("p5")
        })

        it("staying players remain in their box", () => {
            const result = buildProposedGroups(previousGroups, standings, promotionResult)

            const box1Ids = result[0].players!.map(p => p.id)
            const box2Ids = result[1].players!.map(p => p.id)

            // Box 1: p1, p2, p3 stay + p5 promoted
            expect(box1Ids).toContain("p1")
            expect(box1Ids).toContain("p2")
            expect(box1Ids).toContain("p3")

            // Box 2: p6, p7, p8 stay + p4 relegated
            expect(box2Ids).toContain("p6")
            expect(box2Ids).toContain("p7")
            expect(box2Ids).toContain("p8")
        })

        it("produces correct group count and total players", () => {
            const result = buildProposedGroups(previousGroups, standings, promotionResult)

            expect(result).toHaveLength(2)
            const total = result.reduce((s, g) => s + (g.players || []).length, 0)
            expect(total).toBe(8)
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

        it("works with no moves (no promo/relegation)", () => {
            const noMoves: PromotionResult = {
                moves: [],
                stayingPlayers: [
                    { playerId: "p1", groupId: "g1" },
                    { playerId: "p2", groupId: "g1" },
                    { playerId: "p3", groupId: "g1" },
                    { playerId: "p4", groupId: "g1" },
                    { playerId: "p5", groupId: "g2" },
                    { playerId: "p6", groupId: "g2" },
                    { playerId: "p7", groupId: "g2" },
                    { playerId: "p8", groupId: "g2" },
                ],
            }
            const result = buildProposedGroups(previousGroups, standings, noMoves)

            const box1Ids = result[0].players!.map(p => p.id)
            expect(box1Ids).toEqual(expect.arrayContaining(["p1", "p2", "p3", "p4"]))
        })
    })

    it("handles empty groups", () => {
        const emptyGroups: Group[] = [
            { id: "g1", event_id: "e1", group_name: "Box 1", max_players: 4, created_at: "", players: [] },
        ]
        const result = buildProposedGroups(emptyGroups, [], { moves: [], stayingPlayers: [] })
        expect(result).toEqual([])
    })

    describe("filtrage des joueurs desinscrits (registeredPlayerIds)", () => {
        it("exclut les joueurs non inscrits", () => {
            const registered = new Set(["p1", "p2", "p3", "p5", "p6", "p7", "p8"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered)

            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).not.toContain("p4") // relegated but unregistered
            expect(allIds).toHaveLength(7)
        })

        it("exclut un joueur promu qui s'est desinscrit", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p6", "p7", "p8"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered)

            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).not.toContain("p5")
        })

        it("garde tous les joueurs si registeredPlayerIds n'est pas fourni", () => {
            const result = buildProposedGroups(previousGroups, standings, promotionResult)

            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).toHaveLength(8)
        })
    })

    describe("placement des nouveaux joueurs par power_ranking", () => {
        it("place un nouveau joueur fort dans le premier groupe", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new1"])
            const newPlayers = [
                { id: "new1", first_name: "Zack", last_name: "Z", phone: "", power_ranking: 11 },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers)

            const box1Ids = result[0].players!.map(p => p.id)
            expect(box1Ids).toContain("new1")
        })

        it("place un nouveau joueur faible dans le dernier groupe", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new2"])
            const newPlayers = [
                { id: "new2", first_name: "Yves", last_name: "Y", phone: "", power_ranking: 1 },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers)

            const lastGroup = result[result.length - 1]
            const lastIds = lastGroup.players!.map(p => p.id)
            expect(lastIds).toContain("new2")
        })

        it("place un nouveau joueur mid-ranking dans le bon groupe (not Box 1)", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new1"])
            const newPlayers = [
                { id: "new1", first_name: "Mid", last_name: "M", phone: "", power_ranking: 5 },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers)

            // PR 5 < min PR of Box 1 (p5=6), so new1 should NOT be in Box 1
            const box1Ids = result[0].players!.map(p => p.id)
            expect(box1Ids).not.toContain("new1")

            // Should be in one of the lower boxes
            const allIds = result.flatMap(g => (g.players || []).map(p => p.id))
            expect(allIds).toContain("new1")
        })

        it("place un joueur sans power_ranking dans le dernier groupe", () => {
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new3"])
            const newPlayers = [
                { id: "new3", first_name: "Will", last_name: "W", phone: "", power_ranking: 0 },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers)

            const lastGroup = result[result.length - 1]
            expect(lastGroup.players!.map(p => p.id)).toContain("new3")
        })
    })

    describe("cascade overflow when new players exceed box capacity", () => {
        it("cascades weakest player to next box when insertion overflows", () => {
            // 2 boxes of max 4, each full after promo/releg (4+4=8)
            // Insert 1 strong new player (PR=11) into Box 1 → overflow → weakest cascades to Box 2
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new1"])
            const newPlayers = [
                { id: "new1", first_name: "Strong", last_name: "S", phone: "", power_ranking: 11 },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers, 4)

            // Box 1 should not exceed max 4
            expect(result[0].players!.length).toBeLessThanOrEqual(4)
            // new1 should be in Box 1
            expect(result[0].players!.map(p => p.id)).toContain("new1")
        })

        it("cascades through multiple boxes", () => {
            // 2 boxes of max 4, 8 existing players. Insert 2 strong new players → both boxes overflow
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new1", "new2"])
            const newPlayers = [
                { id: "new1", first_name: "Strong1", last_name: "S", phone: "", power_ranking: 12 },
                { id: "new2", first_name: "Strong2", last_name: "S", phone: "", power_ranking: 11 },
            ]
            // With 10 players and max 4, distribution should create 3 boxes
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers, 4)

            // No box should exceed its distribution capacity
            for (let i = 0; i < result.length; i++) {
                expect(result[i].players!.length).toBeLessThanOrEqual(result[i].max_players)
            }
            // Total players preserved
            const total = result.reduce((s, g) => s + (g.players || []).length, 0)
            expect(total).toBe(10)
        })

        it("no box exceeds its distribution capacity (generic property)", () => {
            // 3 boxes, 3 new players of varying strength
            const threeBoxGroups: Group[] = [
                {
                    id: "g1", event_id: "e1", group_name: "Box 1", max_players: 4, created_at: "",
                    players: [
                        { id: "p1", first_name: "A", last_name: "A", phone: "", power_ranking: 1200 },
                        { id: "p2", first_name: "B", last_name: "B", phone: "", power_ranking: 1100 },
                        { id: "p3", first_name: "C", last_name: "C", phone: "", power_ranking: 1000 },
                        { id: "p4", first_name: "D", last_name: "D", phone: "", power_ranking: 900 },
                    ],
                },
                {
                    id: "g2", event_id: "e1", group_name: "Box 2", max_players: 4, created_at: "",
                    players: [
                        { id: "p5", first_name: "E", last_name: "E", phone: "", power_ranking: 800 },
                        { id: "p6", first_name: "F", last_name: "F", phone: "", power_ranking: 700 },
                        { id: "p7", first_name: "G", last_name: "G", phone: "", power_ranking: 600 },
                        { id: "p8", first_name: "H", last_name: "H", phone: "", power_ranking: 500 },
                    ],
                },
                {
                    id: "g3", event_id: "e1", group_name: "Box 3", max_players: 4, created_at: "",
                    players: [
                        { id: "p9", first_name: "I", last_name: "I", phone: "", power_ranking: 400 },
                        { id: "p10", first_name: "J", last_name: "J", phone: "", power_ranking: 300 },
                        { id: "p11", first_name: "K", last_name: "K", phone: "", power_ranking: 200 },
                    ],
                },
            ]
            const threeBoxStandings: GroupStandings[] = []
            const threeBoxPromo: PromotionResult = {
                moves: [],
                stayingPlayers: [
                    { playerId: "p1", groupId: "g1" },
                    { playerId: "p2", groupId: "g1" },
                    { playerId: "p3", groupId: "g1" },
                    { playerId: "p4", groupId: "g1" },
                    { playerId: "p5", groupId: "g2" },
                    { playerId: "p6", groupId: "g2" },
                    { playerId: "p7", groupId: "g2" },
                    { playerId: "p8", groupId: "g2" },
                    { playerId: "p9", groupId: "g3" },
                    { playerId: "p10", groupId: "g3" },
                    { playerId: "p11", groupId: "g3" },
                ],
            }
            const allIds = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11", "new1", "new2", "new3"])
            const newPlayers = [
                { id: "new1", first_name: "Timothy", last_name: "T", phone: "", power_ranking: 1184 },
                { id: "new2", first_name: "Joshua", last_name: "J", phone: "", power_ranking: 580 },
                { id: "new3", first_name: "Ross", last_name: "R", phone: "", power_ranking: 250 },
            ]

            const result = buildProposedGroups(threeBoxGroups, threeBoxStandings, threeBoxPromo, allIds, newPlayers, 5)

            // No box exceeds its distribution capacity
            for (const group of result) {
                expect(group.players!.length).toBeLessThanOrEqual(group.max_players)
            }
            // All players present
            const total = result.reduce((s, g) => s + (g.players || []).length, 0)
            expect(total).toBe(14)
        })

        it("cascaded player lands in the correct lower box by PR", () => {
            // Box 1 max 4, has 4 players (PR 10,9,8,7). Insert new1 PR=11 → weakest (PR=7 i.e. p4/relegated) cascades down
            // We use the promotionResult where p4 is in Box 2 and p5 in Box 1
            // Box 1: p1(10), p2(9), p3(8), p5(6) — inserting new1(11) overflows → p5(6) weakest cascades to Box 2
            const registered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "new1"])
            const newPlayers = [
                { id: "new1", first_name: "Super", last_name: "S", phone: "", power_ranking: 11 },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, newPlayers, 4)

            // p5 (weakest in Box 1 with PR=6) should have been cascaded to Box 2
            const box1Ids = result[0].players!.map(p => p.id)
            const box2Ids = result[1].players!.map(p => p.id)
            expect(box1Ids).not.toContain("p5")
            expect(box2Ids).toContain("p5")
            // new1 stays in Box 1
            expect(box1Ids).toContain("new1")
        })
    })

    describe("recalcul du nombre de box", () => {
        it("increases box count when many new players arrive", () => {
            const allRegistered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "n1", "n2", "n3", "n4"])
            const newP = [
                { id: "n1", first_name: "N1", last_name: "X", phone: "", power_ranking: 11 },
                { id: "n2", first_name: "N2", last_name: "X", phone: "", power_ranking: 7.5 },
                { id: "n3", first_name: "N3", last_name: "X", phone: "", power_ranking: 4.5 },
                { id: "n4", first_name: "N4", last_name: "X", phone: "", power_ranking: 1 },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, allRegistered, newP, 4)

            // 12 players, max 4 → should create more boxes
            expect(result.length).toBeGreaterThan(2)
            const total = result.reduce((s, g) => s + (g.players || []).length, 0)
            expect(total).toBe(12)
        })

        it("decreases box count when many players leave", () => {
            const registered = new Set(["p1", "p2", "p5", "p6"])
            const result = buildProposedGroups(previousGroups, standings, promotionResult, registered, [], 4)

            expect(result).toHaveLength(1)
            const total = result.reduce((s, g) => s + (g.players || []).length, 0)
            expect(total).toBe(4)
        })

        it("generates correct group names", () => {
            const allRegistered = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "n1", "n2", "n3", "n4"])
            const newP = [
                { id: "n1", first_name: "N1", last_name: "X", phone: "", power_ranking: 11 },
                { id: "n2", first_name: "N2", last_name: "X", phone: "", power_ranking: 7.5 },
                { id: "n3", first_name: "N3", last_name: "X", phone: "", power_ranking: 4.5 },
                { id: "n4", first_name: "N4", last_name: "X", phone: "", power_ranking: 1 },
            ]
            const result = buildProposedGroups(previousGroups, standings, promotionResult, allRegistered, newP, 4)

            for (let i = 0; i < result.length; i++) {
                expect(result[i].group_name).toBe(`Box ${i + 1}`)
            }
        })
    })
})

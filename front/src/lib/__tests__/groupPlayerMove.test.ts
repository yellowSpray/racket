import { describe, it, expect } from "vitest"
import { movePlayerBetweenGroups, movePlayerToPosition, validateGroups } from "../groupPlayerMove"
import type { Group } from "@/types/draw"

const makeGroups = (): Group[] => [
    {
        id: "g1", event_id: "e1", group_name: "Box 1", max_players: 3, created_at: "",
        players: [
            { id: "p1", first_name: "Alice", last_name: "A", phone: "", power_ranking: 10 },
            { id: "p2", first_name: "Bob", last_name: "B", phone: "", power_ranking: 20 },
        ],
    },
    {
        id: "g2", event_id: "e1", group_name: "Box 2", max_players: 3, created_at: "",
        players: [
            { id: "p3", first_name: "Charlie", last_name: "C", phone: "", power_ranking: 30 },
        ],
    },
]

describe("movePlayerBetweenGroups", () => {
    it("moves a player from one group to another", () => {
        const result = movePlayerBetweenGroups(makeGroups(), "p1", "g1", "g2")
        expect(result.find(g => g.id === "g1")!.players).toHaveLength(1)
        expect(result.find(g => g.id === "g2")!.players).toHaveLength(2)
        expect(result.find(g => g.id === "g2")!.players!.some(p => p.id === "p1")).toBe(true)
    })

    it("returns same groups if moving to the same group", () => {
        const groups = makeGroups()
        const result = movePlayerBetweenGroups(groups, "p1", "g1", "g1")
        expect(result).toEqual(groups)
    })

    it("returns same groups if player not found", () => {
        const groups = makeGroups()
        const result = movePlayerBetweenGroups(groups, "unknown", "g1", "g2")
        expect(result).toEqual(groups)
    })

    it("does not mutate the original groups", () => {
        const groups = makeGroups()
        movePlayerBetweenGroups(groups, "p1", "g1", "g2")
        expect(groups[0].players).toHaveLength(2)
        expect(groups[1].players).toHaveLength(1)
    })
})

describe("movePlayerToPosition", () => {
    it("cross-groupe : insère en début de liste (index 0)", () => {
        const result = movePlayerToPosition(makeGroups(), "p1", "g1", "g2", 0)
        expect(result.find(g => g.id === "g1")!.players!.map(p => p.id)).toEqual(["p2"])
        expect(result.find(g => g.id === "g2")!.players!.map(p => p.id)).toEqual(["p1", "p3"])
    })

    it("cross-groupe : insère en fin de liste", () => {
        const result = movePlayerToPosition(makeGroups(), "p1", "g1", "g2", 1)
        expect(result.find(g => g.id === "g2")!.players!.map(p => p.id)).toEqual(["p3", "p1"])
    })

    it("même groupe : déplace vers le bas", () => {
        const groups: Group[] = [{
            id: "g1", event_id: "e1", group_name: "Box 1", max_players: 4, created_at: "",
            players: [
                { id: "A", first_name: "A", last_name: "", phone: "", power_ranking: 0 },
                { id: "B", first_name: "B", last_name: "", phone: "", power_ranking: 0 },
                { id: "C", first_name: "C", last_name: "", phone: "", power_ranking: 0 },
                { id: "D", first_name: "D", last_name: "", phone: "", power_ranking: 0 },
            ],
        }]
        const result = movePlayerToPosition(groups, "A", "g1", "g1", 2)
        expect(result[0].players!.map(p => p.id)).toEqual(["B", "A", "C", "D"])
    })

    it("même groupe : déplace vers le haut", () => {
        const groups: Group[] = [{
            id: "g1", event_id: "e1", group_name: "Box 1", max_players: 4, created_at: "",
            players: [
                { id: "A", first_name: "A", last_name: "", phone: "", power_ranking: 0 },
                { id: "B", first_name: "B", last_name: "", phone: "", power_ranking: 0 },
                { id: "C", first_name: "C", last_name: "", phone: "", power_ranking: 0 },
                { id: "D", first_name: "D", last_name: "", phone: "", power_ranking: 0 },
            ],
        }]
        const result = movePlayerToPosition(groups, "C", "g1", "g1", 0)
        expect(result[0].players!.map(p => p.id)).toEqual(["C", "A", "B", "D"])
    })

    it("ne mute pas les groupes originaux", () => {
        const groups = makeGroups()
        movePlayerToPosition(groups, "p1", "g1", "g2", 0)
        expect(groups[0].players!.map(p => p.id)).toEqual(["p1", "p2"])
    })

    it("retourne les groupes inchangés si joueur introuvable", () => {
        const groups = makeGroups()
        const result = movePlayerToPosition(groups, "unknown", "g1", "g2", 0)
        expect(result).toEqual(groups)
    })
})

describe("validateGroups", () => {
    it("returns valid for well-formed groups", () => {
        const result = validateGroups(makeGroups())
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it("returns invalid when a group is empty", () => {
        const groups = makeGroups()
        groups[1].players = []
        const result = validateGroups(groups)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes("Box 2"))).toBe(true)
    })

    it("returns invalid when a group exceeds max_players", () => {
        const groups = makeGroups()
        groups[1].players = [
            { id: "p3", first_name: "C", last_name: "C", phone: "", power_ranking: 30 },
            { id: "p4", first_name: "D", last_name: "D", phone: "", power_ranking: 40 },
            { id: "p5", first_name: "E", last_name: "E", phone: "", power_ranking: 50 },
            { id: "p6", first_name: "F", last_name: "F", phone: "", power_ranking: 60 },
        ]
        const result = validateGroups(groups)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes("Box 2"))).toBe(true)
    })
})

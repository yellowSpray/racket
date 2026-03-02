import { describe, it, expect } from "vitest"
import { movePlayerBetweenGroups, validateGroups } from "./groupPlayerMove"
import type { Group } from "@/types/draw"

const makeGroups = (): Group[] => [
    {
        id: "g1", event_id: "e1", group_name: "Box 1", max_players: 3, created_at: "",
        players: [
            { id: "p1", first_name: "Alice", last_name: "A", phone: "", power_ranking: "10" },
            { id: "p2", first_name: "Bob", last_name: "B", phone: "", power_ranking: "20" },
        ],
    },
    {
        id: "g2", event_id: "e1", group_name: "Box 2", max_players: 3, created_at: "",
        players: [
            { id: "p3", first_name: "Charlie", last_name: "C", phone: "", power_ranking: "30" },
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
            { id: "p3", first_name: "C", last_name: "C", phone: "", power_ranking: "30" },
            { id: "p4", first_name: "D", last_name: "D", phone: "", power_ranking: "40" },
            { id: "p5", first_name: "E", last_name: "E", phone: "", power_ranking: "50" },
            { id: "p6", first_name: "F", last_name: "F", phone: "", power_ranking: "60" },
        ]
        const result = validateGroups(groups)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes("Box 2"))).toBe(true)
    })
})

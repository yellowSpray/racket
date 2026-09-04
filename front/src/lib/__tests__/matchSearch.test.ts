import { describe, it, expect } from "vitest"
import { normalizeSearch, matchesPlayerSearch } from "../matchSearch"
import type { Match } from "@/types/match"

function match(p1: string, p2: string): Match {
    const [f1, l1] = p1.split(" ")
    const [f2, l2] = p2.split(" ")
    return {
        id: "m1", group_id: "g1", player1_id: "p1", player2_id: "p2",
        match_date: "2026-06-10", match_time: "19:00", court_number: "Terrain 1",
        winner_id: null, score: null,
        player1: { id: "p1", first_name: f1, last_name: l1 },
        player2: { id: "p2", first_name: f2, last_name: l2 },
    } as Match
}

describe("normalizeSearch", () => {
    it("passe en minuscules", () => {
        expect(normalizeSearch("MARTIN")).toBe("martin")
    })

    it("retire les accents", () => {
        // Un admin tape rarement les accents dans une recherche.
        expect(normalizeSearch("Lefèvre")).toBe("lefevre")
        expect(normalizeSearch("Frédéric")).toBe("frederic")
    })

    it("supprime les espaces autour", () => {
        expect(normalizeSearch("  bob  ")).toBe("bob")
    })
})

describe("matchesPlayerSearch", () => {
    const m = match("Alice Martin", "Bob Dupont")

    it("accepte tout quand la recherche est vide", () => {
        expect(matchesPlayerSearch(m, "")).toBe(true)
        expect(matchesPlayerSearch(m, "   ")).toBe(true)
    })

    it("trouve par prenom", () => {
        expect(matchesPlayerSearch(m, "alice")).toBe(true)
    })

    it("trouve par nom", () => {
        expect(matchesPlayerSearch(m, "dupont")).toBe(true)
    })

    it("trouve sur le second joueur autant que sur le premier", () => {
        expect(matchesPlayerSearch(m, "bob")).toBe(true)
    })

    it("trouve sur le nom complet", () => {
        expect(matchesPlayerSearch(m, "alice martin")).toBe(true)
    })

    it("ignore accents et casse", () => {
        expect(matchesPlayerSearch(match("Frédéric Polome", "Léa Timm"), "frederic")).toBe(true)
        expect(matchesPlayerSearch(match("Frédéric Polome", "Léa Timm"), "LEA")).toBe(true)
    })

    it("rejette un joueur absent du match", () => {
        expect(matchesPlayerSearch(m, "chloe")).toBe(false)
    })

    it("tolere un match sans joueur charge", () => {
        // Les jointures peuvent manquer : ne pas planter, ne pas faire remonter.
        const orphan = { ...m, player1: undefined, player2: undefined } as Match
        expect(matchesPlayerSearch(orphan, "alice")).toBe(false)
        expect(matchesPlayerSearch(orphan, "")).toBe(true)
    })
})

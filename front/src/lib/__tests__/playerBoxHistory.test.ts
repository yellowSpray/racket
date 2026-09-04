import { describe, it, expect } from "vitest"
import { boxNumber, buildPlayerHistory, type PlayerHistoryRow } from "../playerBoxHistory"

describe("boxNumber", () => {
    it("extrait le numero d'un nom de box", () => {
        expect(boxNumber("Box 3")).toBe(3)
    })

    it("supporte les numeros a deux chiffres", () => {
        expect(boxNumber("Box 12")).toBe(12)
    })

    it("tolere la casse et les espaces", () => {
        expect(boxNumber("  box 4 ")).toBe(4)
    })

    it("rend null sur un nom libre", () => {
        // Rien n'empeche un admin de renommer un tableau : on prefere ne pas
        // afficher de mouvement plutot que d'en inventer un.
        expect(boxNumber("Poule des vétérans")).toBeNull()
    })
})

function row(overrides: Partial<PlayerHistoryRow> & { box: string; date: string }): PlayerHistoryRow {
    const { box, date, ...rest } = overrides
    return {
        group_name: box,
        round_number: 1,
        start_date: date,
        event_name: "Interclub",
        ...rest,
    }
}

describe("buildPlayerHistory", () => {
    it("ordonne les passages du plus ancien au plus recent", () => {
        const history = buildPlayerHistory([
            row({ box: "Box 3", date: "2026-07-01", round_number: 2 }),
            row({ box: "Box 5", date: "2026-06-01", round_number: 1 }),
        ])
        expect(history.map(h => h.roundNumber)).toEqual([1, 2])
    })

    it("marque le premier passage comme un debut", () => {
        const history = buildPlayerHistory([row({ box: "Box 5", date: "2026-06-01" })])
        expect(history[0].movement).toBe("first")
    })

    it("detecte une montee quand le numero de box baisse", () => {
        // Le box 1 est le plus fort : monter, c'est descendre en numero.
        const history = buildPlayerHistory([
            row({ box: "Box 5", date: "2026-06-01", round_number: 1 }),
            row({ box: "Box 3", date: "2026-07-01", round_number: 2 }),
        ])
        expect(history[1].movement).toBe("up")
    })

    it("detecte une descente", () => {
        const history = buildPlayerHistory([
            row({ box: "Box 2", date: "2026-06-01", round_number: 1 }),
            row({ box: "Box 4", date: "2026-07-01", round_number: 2 }),
        ])
        expect(history[1].movement).toBe("down")
    })

    it("detecte un maintien", () => {
        const history = buildPlayerHistory([
            row({ box: "Box 2", date: "2026-06-01", round_number: 1 }),
            row({ box: "Box 2", date: "2026-07-01", round_number: 2 }),
        ])
        expect(history[1].movement).toBe("same")
    })

    it("n'invente pas de mouvement sur un nom de box illisible", () => {
        const history = buildPlayerHistory([
            row({ box: "Box 2", date: "2026-06-01", round_number: 1 }),
            row({ box: "Poule ouverte", date: "2026-07-01", round_number: 2 }),
            row({ box: "Box 1", date: "2026-08-01", round_number: 3 }),
        ])
        expect(history[1].movement).toBe("unknown")
        // Le passage suivant se compare au dernier box connu, pas au trou.
        expect(history[2].movement).toBe("up")
    })

    it("compare a travers deux evenements differents", () => {
        // Les series ne se suivent pas forcement dans le meme evenement :
        // c'est la date qui fait l'ordre, pas le numero de serie.
        const history = buildPlayerHistory([
            row({ box: "Box 4", date: "2026-06-01", round_number: 3, event_name: "Hiver" }),
            row({ box: "Box 2", date: "2026-09-01", round_number: 1, event_name: "Automne" }),
        ])
        expect(history.map(h => h.eventName)).toEqual(["Hiver", "Automne"])
        expect(history[1].movement).toBe("up")
    })

    it("rend une liste vide sans passage", () => {
        expect(buildPlayerHistory([])).toEqual([])
    })
})

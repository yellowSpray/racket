import { describe, it, expect } from "vitest"
import { resolveRegisteredIds, type RegistrationSources } from "../roundRegistrations"

function sources(overrides: Partial<RegistrationSources> = {}): RegistrationSources {
    return {
        roundRegistrations: [],
        ownGroupMembers: [],
        previousGroupMembers: [],
        eventRegistrations: [],
        hasPreviousRound: false,
        ...overrides,
    }
}

describe("resolveRegisteredIds", () => {
    it("prefere les inscriptions rattachees a la serie", () => {
        // C'est la seule source que l'admin a explicitement composee.
        const result = resolveRegisteredIds(sources({
            roundRegistrations: ["a", "b"],
            ownGroupMembers: ["c"],
            previousGroupMembers: ["d"],
            eventRegistrations: ["e"],
            hasPreviousRound: true,
        }))
        expect([...result.ids]).toEqual(["a", "b"])
        expect(result.source).toBe("round")
    })

    it("retombe sur les tableaux de la serie", () => {
        // Serie composee avant la migration : aucune ligne rattachee, mais les
        // tableaux disent exactement qui joue.
        const result = resolveRegisteredIds(sources({
            ownGroupMembers: ["c", "d"],
            previousGroupMembers: ["x"],
            eventRegistrations: ["y"],
            hasPreviousRound: true,
        }))
        expect([...result.ids]).toEqual(["c", "d"])
        expect(result.source).toBe("groups")
    })

    it("retombe sur la serie precedente", () => {
        const result = resolveRegisteredIds(sources({
            previousGroupMembers: ["x", "y"],
            eventRegistrations: ["z"],
            hasPreviousRound: true,
        }))
        expect([...result.ids]).toEqual(["x", "y"])
        expect(result.source).toBe("previous")
    })

    it("n'utilise les inscriptions d'evenement que sur la premiere serie", () => {
        // C'est la regle qui corrige le melange : des la serie 2, les lignes au
        // niveau evenement ne sont plus consultees.
        const result = resolveRegisteredIds(sources({
            eventRegistrations: ["z"],
            hasPreviousRound: false,
        }))
        expect([...result.ids]).toEqual(["z"])
        expect(result.source).toBe("event")
    })

    it("rend un ensemble vide sur une serie suivante sans rien avant", () => {
        // Serie precedente vide : on ne va surtout pas chercher les inscriptions
        // d'evenement, qui sont justement la source du melange.
        const result = resolveRegisteredIds(sources({
            eventRegistrations: ["z"],
            hasPreviousRound: true,
        }))
        expect([...result.ids]).toEqual([])
        expect(result.source).toBe("previous")
    })

    it("dedoublonne", () => {
        const result = resolveRegisteredIds(sources({
            roundRegistrations: ["a", "a", "b"],
        }))
        expect([...result.ids]).toEqual(["a", "b"])
    })

    it("signale qu'une materialisation est necessaire hors source serie", () => {
        // Tant que la source n'est pas la serie elle-meme, l'ensemble affiche
        // n'existe nulle part en base : le retirer d'un joueur ne supprimerait
        // rien et il reviendrait au rechargement.
        expect(resolveRegisteredIds(sources({ roundRegistrations: ["a"] })).needsMaterialization).toBe(false)
        expect(resolveRegisteredIds(sources({ ownGroupMembers: ["a"] })).needsMaterialization).toBe(true)
        expect(resolveRegisteredIds(sources({ previousGroupMembers: ["a"], hasPreviousRound: true })).needsMaterialization).toBe(true)
    })

    it("ne demande pas de materialisation pour un ensemble vide", () => {
        // Rien a ecrire, et surtout pas de quoi masquer une future inscription.
        expect(resolveRegisteredIds(sources({ hasPreviousRound: true })).needsMaterialization).toBe(false)
    })
})

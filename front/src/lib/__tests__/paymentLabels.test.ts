import { describe, it, expect } from "vitest"
import { paymentSeriesLabel, paymentFullLabel } from "../paymentLabels"
import type { PlayerPayment } from "@/types/player"

function payment(overrides: Partial<PlayerPayment> = {}): PlayerPayment {
    return {
        round_id: "r1",
        round_number: 4,
        event_name: "Mixed",
        status: "unpaid",
        ...overrides,
    }
}

describe("paymentSeriesLabel", () => {
    it("nomme la serie, pas l'evenement", () => {
        expect(paymentSeriesLabel(payment())).toBe("Série 4")
    })

    it("suit le numero de serie", () => {
        expect(paymentSeriesLabel(payment({ round_number: 12 }))).toBe("Série 12")
    })
})

describe("paymentFullLabel", () => {
    it("ajoute l'evenement, pour lever l'ambiguite au survol", () => {
        // Deux evenements peuvent avoir une serie 4 : le badge reste court,
        // l'infobulle dit de laquelle il s'agit.
        expect(paymentFullLabel(payment())).toBe("Mixed, série 4 : non payé")
    })

    it("dit quand c'est paye", () => {
        expect(paymentFullLabel(payment({ status: "paid" }))).toBe("Mixed, série 4 : payé")
    })

    it("se passe d'un nom d'evenement manquant", () => {
        expect(paymentFullLabel(payment({ event_name: "" }))).toBe("Série 4 : non payé")
    })
})

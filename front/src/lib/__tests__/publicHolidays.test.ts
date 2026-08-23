import { describe, it, expect } from "vitest"
import { getPublicHolidays, generatePlayingDates } from "../publicHolidays"

// Pâques 2025 = 20 avril | Pâques 2024 = 31 mars

describe("getPublicHolidays — France (FR)", () => {
    it("retourne 11 jours fériés", () => {
        expect(getPublicHolidays(2025)).toHaveLength(11)
        expect(getPublicHolidays(2025, "FR")).toHaveLength(11)
    })

    it("contient les jours fixes", () => {
        const h = getPublicHolidays(2025)
        expect(h).toContain("2025-01-01")
        expect(h).toContain("2025-05-01")
        expect(h).toContain("2025-05-08")
        expect(h).toContain("2025-07-14")
        expect(h).toContain("2025-08-15")
        expect(h).toContain("2025-11-01")
        expect(h).toContain("2025-11-11")
        expect(h).toContain("2025-12-25")
    })

    it("contient les jours calculés depuis Pâques 2025", () => {
        const h = getPublicHolidays(2025)
        expect(h).toContain("2025-04-21") // Lundi de Pâques
        expect(h).toContain("2025-05-29") // Ascension
        expect(h).toContain("2025-06-09") // Pentecôte
    })

    it("retourne des dates triées", () => {
        const h = getPublicHolidays(2025)
        expect(h).toEqual([...h].sort())
    })
})

describe("getPublicHolidays — Belgique (BE)", () => {
    it("retourne 10 jours fériés", () => {
        expect(getPublicHolidays(2025, "BE")).toHaveLength(10)
    })

    it("contient le 21 juillet (fête nationale belge)", () => {
        expect(getPublicHolidays(2025, "BE")).toContain("2025-07-21")
    })

    it("ne contient PAS le 8 mai ni le 14 juillet", () => {
        const h = getPublicHolidays(2025, "BE")
        expect(h).not.toContain("2025-05-08")
        expect(h).not.toContain("2025-07-14")
    })

    it("contient les jours de Pâques (Lundi, Ascension, Pentecôte)", () => {
        const h = getPublicHolidays(2025, "BE")
        expect(h).toContain("2025-04-21") // Lundi de Pâques
        expect(h).toContain("2025-05-29") // Ascension
        expect(h).toContain("2025-06-09") // Lundi de Pentecôte
    })
})

describe("getPublicHolidays — Pays-Bas (NL)", () => {
    it("retourne 8 jours fériés", () => {
        expect(getPublicHolidays(2025, "NL")).toHaveLength(8)
    })

    it("contient le Koningsdag (27 avril) et le 26 décembre", () => {
        const h = getPublicHolidays(2025, "NL")
        expect(h).toContain("2025-04-27") // Koningsdag
        expect(h).toContain("2025-12-26") // Tweede Kerstdag
    })

    it("contient le Vendredi Saint (Goede Vrijdag)", () => {
        // Pâques 2025 = 20 avril → Vendredi Saint = 18 avril
        expect(getPublicHolidays(2025, "NL")).toContain("2025-04-18")
    })
})

describe("getPublicHolidays — Allemagne (DE)", () => {
    it("retourne 9 jours fériés nationaux", () => {
        expect(getPublicHolidays(2025, "DE")).toHaveLength(9)
    })

    it("contient le 3 octobre et le 26 décembre", () => {
        const h = getPublicHolidays(2025, "DE")
        expect(h).toContain("2025-10-03") // Tag der Deutschen Einheit
        expect(h).toContain("2025-12-26") // Zweiter Weihnachtstag
    })

    it("contient le Vendredi Saint et le Lundi de Pâques", () => {
        const h = getPublicHolidays(2025, "DE")
        expect(h).toContain("2025-04-18") // Karfreitag
        expect(h).toContain("2025-04-21") // Ostermontag
    })
})

describe("getPublicHolidays — Suisse (CH)", () => {
    it("retourne 9 jours fériés communs", () => {
        expect(getPublicHolidays(2025, "CH")).toHaveLength(9)
    })

    it("contient le 1er août et le 2 janvier", () => {
        const h = getPublicHolidays(2025, "CH")
        expect(h).toContain("2025-08-01") // Nationalfeiertag
        expect(h).toContain("2025-01-02") // Berchtoldstag
    })
})

describe("getPublicHolidays — Espagne (ES)", () => {
    it("retourne 10 jours fériés nationaux", () => {
        expect(getPublicHolidays(2025, "ES")).toHaveLength(10)
    })

    it("contient le 6 janvier, le 12 octobre et le 6 décembre", () => {
        const h = getPublicHolidays(2025, "ES")
        expect(h).toContain("2025-01-06") // Reyes Magos
        expect(h).toContain("2025-10-12") // Fiesta Nacional
        expect(h).toContain("2025-12-06") // Día de la Constitución
    })

    it("ne contient PAS le Lundi de Pâques (non national)", () => {
        expect(getPublicHolidays(2025, "ES")).not.toContain("2025-04-21")
    })
})

describe("getPublicHolidays — Portugal (PT)", () => {
    it("retourne 13 jours fériés", () => {
        expect(getPublicHolidays(2025, "PT")).toHaveLength(13)
    })

    it("contient le 25 avril, le 10 juin et le 1er décembre", () => {
        const h = getPublicHolidays(2025, "PT")
        expect(h).toContain("2025-04-25") // Dia da Liberdade
        expect(h).toContain("2025-06-10") // Dia de Portugal
        expect(h).toContain("2025-12-01") // Restauração da Independência
    })

    it("contient le Corpus Christi (Pâques +60)", () => {
        // Pâques 2025 = 20 avril → +60 = 19 juin
        expect(getPublicHolidays(2025, "PT")).toContain("2025-06-19")
    })
})

describe("getPublicHolidays — Luxembourg (LU)", () => {
    it("retourne 10 jours fériés", () => {
        expect(getPublicHolidays(2025, "LU")).toHaveLength(10)
    })

    it("contient le 23 juin (fête nationale) et le 26 décembre", () => {
        const h = getPublicHolidays(2025, "LU")
        expect(h).toContain("2025-06-23") // Fête nationale
        expect(h).toContain("2025-12-26") // Saint-Étienne
    })
})

describe("getPublicHolidays — Italie (IT)", () => {
    it("retourne 12 jours fériés", () => {
        expect(getPublicHolidays(2025, "IT")).toHaveLength(12)
    })

    it("contient le 6 janvier, le 2 juin et le 26 décembre", () => {
        const h = getPublicHolidays(2025, "IT")
        expect(h).toContain("2025-01-06") // Epifania
        expect(h).toContain("2025-06-02") // Festa della Repubblica
        expect(h).toContain("2025-12-26") // Santo Stefano
    })

    it("contient le 25 avril et le Lundi de Pâques", () => {
        const h = getPublicHolidays(2025, "IT")
        expect(h).toContain("2025-04-25") // Liberazione
        expect(h).toContain("2025-04-21") // Lunedì dell'Angelo
    })
})

describe("generatePlayingDates", () => {
    it("retourne un tableau vide si la plage est invalide", () => {
        expect(generatePlayingDates("2025-06-10", "2025-06-01", [1], false)).toEqual([])
    })

    it("génère tous les jeudis d'une plage", () => {
        const dates = generatePlayingDates("2025-09-01", "2025-09-30", [4], false)
        expect(dates).toEqual(["2025-09-04", "2025-09-11", "2025-09-18", "2025-09-25"])
    })

    it("génère lundi et jeudi sur une semaine", () => {
        const dates = generatePlayingDates("2025-09-01", "2025-09-07", [1, 4], false)
        expect(dates).toEqual(["2025-09-01", "2025-09-04"])
    })

    it("inclut les bornes", () => {
        const dates = generatePlayingDates("2025-09-01", "2025-09-01", [1], false)
        expect(dates).toEqual(["2025-09-01"])
    })

    it("exclut les jours fériés FR si demandé", () => {
        // 2025-11-11 (Armistice) est un mardi
        const with_ = generatePlayingDates("2025-11-10", "2025-11-12", [2, 3], false)
        const without = generatePlayingDates("2025-11-10", "2025-11-12", [2, 3], true, "FR")
        expect(with_).toContain("2025-11-11")
        expect(without).not.toContain("2025-11-11")
    })

    it("exclut les jours fériés BE (21 juillet)", () => {
        // 2025-07-21 est un lundi
        const without = generatePlayingDates("2025-07-21", "2025-07-21", [1], true, "BE")
        expect(without).toHaveLength(0)
    })

    it("exclut le 3 octobre en Allemagne", () => {
        // 2025-10-03 est un vendredi
        const without = generatePlayingDates("2025-10-03", "2025-10-03", [5], true, "DE")
        expect(without).toHaveLength(0)
    })

    it("inclut le 21 juillet en FR (pas un férié français)", () => {
        // En France, le 21 juillet n'est pas férié
        const dates = generatePlayingDates("2025-07-21", "2025-07-21", [1], true, "FR")
        expect(dates).toContain("2025-07-21")
    })

    it("si aucun jour sélectionné, inclut tous les jours", () => {
        const dates = generatePlayingDates("2025-09-01", "2025-09-07", [], false)
        expect(dates).toHaveLength(7)
    })

    it("retourne un tableau trié", () => {
        const dates = generatePlayingDates("2025-09-01", "2025-09-30", [1, 4], false)
        expect(dates).toEqual([...dates].sort())
    })

    it("gère un span d'un an sans erreur", () => {
        const dates = generatePlayingDates("2025-01-01", "2025-12-31", [4], false)
        expect(dates.length).toBeGreaterThan(50)
        expect(dates.every(d => d.startsWith("2025"))).toBe(true)
    })
})

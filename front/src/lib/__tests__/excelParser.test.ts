import { describe, it, expect } from "vitest"
import {
    findHeaderRow,
    fuzzyMatchColumns,
    parsePlayersFromSheet,
    excelTimeToHHMM,
    parseStatus,
    parseBooleanCell,
    type ColumnMapping,
} from "../excelParser"

describe("excelTimeToHHMM", () => {
    it("converts 0.0 to 00:00", () => {
        expect(excelTimeToHHMM(0)).toBe("00:00")
    })

    it("converts 0.5 to 12:00", () => {
        expect(excelTimeToHHMM(0.5)).toBe("12:00")
    })

    it("converts 0.75 to 18:00", () => {
        expect(excelTimeToHHMM(0.75)).toBe("18:00")
    })

    it("converts 0.8333... to 20:00", () => {
        expect(excelTimeToHHMM(0.8333333333333334)).toBe("20:00")
    })

    it("converts 0.8541... to 20:30", () => {
        expect(excelTimeToHHMM(0.8541666666666666)).toBe("20:30")
    })

    it("converts 0.7708... to 18:30", () => {
        expect(excelTimeToHHMM(0.7708333333333334)).toBe("18:30")
    })

    it("pads hours and minutes with leading zeros", () => {
        expect(excelTimeToHHMM(0.041666666666667)).toBe("01:00")
    })
})

describe("findHeaderRow", () => {
    it("returns 0 when headers are on first row", () => {
        const data = [
            ["prenom", "nom", "email", "telephone"],
            ["Alexandra", "Empain", "a@b.com", "0498"],
        ]
        expect(findHeaderRow(data)).toBe(0)
    })

    it("skips empty rows and title rows to find the header", () => {
        const data = [
            ["Mon Titre", "", ""],
            ["", "", ""],
            ["prenom", "nom", "email", "telephone"],
            ["Alexandra", "Empain", "a@b.com", "0498"],
        ]
        expect(findHeaderRow(data)).toBe(2)
    })

    it("returns 0 for a single-row sheet", () => {
        const data = [["prenom", "nom", "email"]]
        expect(findHeaderRow(data)).toBe(0)
    })

    it("returns -1 when no valid header row found", () => {
        const data = [[""], [""], [""]]
        expect(findHeaderRow(data)).toBe(-1)
    })
})

describe("parseStatus", () => {
    it("returns ['active'] for empty string", () => {
        expect(parseStatus("")).toEqual(["active"])
    })

    it("maps 'actif' to active", () => {
        expect(parseStatus("actif")).toEqual(["active"])
    })

    it("maps 'membre' to member", () => {
        expect(parseStatus("membre")).toEqual(["member"])
    })

    it("maps 'active' (english) to active", () => {
        expect(parseStatus("active")).toEqual(["active"])
    })

    it("maps 'member' (english) to member", () => {
        expect(parseStatus("member")).toEqual(["member"])
    })

    it("maps 'inactif' to inactive", () => {
        expect(parseStatus("inactif")).toEqual(["inactive"])
    })

    it("handles comma-separated values", () => {
        expect(parseStatus("actif,membre")).toEqual(["active", "member"])
    })

    it("handles semicolon-separated values", () => {
        expect(parseStatus("actif;membre")).toEqual(["active", "member"])
    })

    it("returns ['active'] for unrecognized value", () => {
        expect(parseStatus("inconnu")).toEqual(["active"])
    })

    it("is case-insensitive", () => {
        expect(parseStatus("ACTIF")).toEqual(["active"])
        expect(parseStatus("Membre")).toEqual(["member"])
    })
})

describe("fuzzyMatchColumns", () => {
    it("matches exact column names", () => {
        const headers = ["prenom", "nom", "email", "telephone"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.first_name).toBe(0)
        expect(mapping.last_name).toBe(1)
        expect(mapping.email).toBe(2)
        expect(mapping.phone).toBe(3)
    })

    it("matches accented column names (téléphone)", () => {
        const headers = ["prénom", "nom", "email", "téléphone"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.first_name).toBe(0)
        expect(mapping.phone).toBe(3)
    })

    it("matches with trailing spaces (trimming)", () => {
        const headers = ["prenom ", "nom ", "email", "téléphone"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.first_name).toBe(0)
        expect(mapping.last_name).toBe(1)
    })

    it("matches 'gsm' to phone", () => {
        const headers = ["prenom", "nom", "gsm", "email"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.phone).toBe(2)
    })

    it("matches 'heure' to arrival", () => {
        const headers = ["prenom", "nom", "email", "heure"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.arrival).toBe(3)
    })

    it("matches 'statut' to status", () => {
        const headers = ["prenom", "nom", "statut"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.status).toBe(2)
    })

    it("returns undefined for unrecognized columns", () => {
        const headers = ["prenom", "nom", "email", "unknown_col"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.arrival).toBeUndefined()
    })

    it("ignores case differences", () => {
        const headers = ["PRENOM", "NOM", "EMAIL", "TELEPHONE"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.first_name).toBe(0)
        expect(mapping.last_name).toBe(1)
        expect(mapping.email).toBe(2)
        expect(mapping.phone).toBe(3)
    })
})

describe("parsePlayersFromSheet", () => {
    const mapping: ColumnMapping = {
        first_name: 0,
        last_name: 1,
        phone: 2,
        email: 3,
        arrival: 4,
    }

    it("parses basic player rows", () => {
        const data = [
            ["Alexandra", "Empain", "0498571931", "a@b.com", 0.8541666666666666],
            ["Charles", "Bouchat", "0498567907", "c@b.com", 0.7708333333333334],
        ]
        const players = parsePlayersFromSheet(data, mapping)
        expect(players).toHaveLength(2)
        expect(players[0]).toMatchObject({
            first_name: "Alexandra",
            last_name: "Empain",
            phone: "0498571931",
            email: "a@b.com",
            arrival: "20:30",
        })
        expect(players[1]).toMatchObject({
            first_name: "Charles",
            last_name: "Bouchat",
            arrival: "18:30",
        })
    })

    it("filters out empty rows", () => {
        const data = [
            ["Alexandra", "Empain", "0498571931", "a@b.com", ""],
            ["", "", "", "", ""],
            ["Charles", "Bouchat", "0498567907", "c@b.com", ""],
        ]
        const players = parsePlayersFromSheet(data, mapping)
        expect(players).toHaveLength(2)
    })

    it("ignores arrival if column is not in mapping", () => {
        const mappingNoArrival: ColumnMapping = {
            first_name: 0,
            last_name: 1,
            email: 2,
        }
        const data = [["Alexandra", "Empain", "a@b.com"]]
        const players = parsePlayersFromSheet(data, mappingNoArrival)
        expect(players[0].arrival).toBeUndefined()
    })

    it("handles non-numeric arrival values gracefully", () => {
        const data = [["Alexandra", "Empain", "0498", "a@b.com", ""]]
        const players = parsePlayersFromSheet(data, mapping)
        expect(players[0].arrival).toBeUndefined()
    })

    it("sets default power_ranking to 5", () => {
        const data = [["Alexandra", "Empain", "0498571931", "a@b.com", ""]]
        const players = parsePlayersFromSheet(data, mapping)
        expect(players[0].power_ranking).toBe(5)
    })

    it("defaults status to ['active'] when no status column", () => {
        const data = [["Alexandra", "Empain", "0498571931", "a@b.com", ""]]
        const players = parsePlayersFromSheet(data, mapping)
        expect(players[0].status).toEqual(["active"])
    })

    it("reads status from mapped column", () => {
        const mappingWithStatus: ColumnMapping = { ...mapping, status: 5 }
        const data = [["Alexandra", "Empain", "0498571931", "a@b.com", "", "membre"]]
        const players = parsePlayersFromSheet(data, mappingWithStatus)
        expect(players[0].status).toEqual(["member"])
    })

    it("returns empty array for empty data", () => {
        const players = parsePlayersFromSheet([], mapping)
        expect(players).toHaveLength(0)
    })

    it("reads active+member boolean columns (format réel)", () => {
        const mappingWithBool: ColumnMapping = { ...mapping, active: 5, member: 6 }
        const data = [["Alexandra", "Empain", "0498571931", "a@b.com", "", "active", "yes"]]
        const players = parsePlayersFromSheet(data, mappingWithBool)
        expect(players[0].status).toEqual(["active", "member"])
    })

    it("active=active, member=no → status=['active']", () => {
        const mappingWithBool: ColumnMapping = { ...mapping, active: 5, member: 6 }
        const data = [["Alexandra", "Empain", "0498571931", "a@b.com", "", "active", "no"]]
        const players = parsePlayersFromSheet(data, mappingWithBool)
        expect(players[0].status).toEqual(["active"])
    })

    it("active=inactive, member=no → status=['active'] (défaut)", () => {
        const mappingWithBool: ColumnMapping = { ...mapping, active: 5, member: 6 }
        const data = [["Alexandra", "Empain", "0498571931", "a@b.com", "", "inactive", "no"]]
        const players = parsePlayersFromSheet(data, mappingWithBool)
        expect(players[0].status).toEqual(["active"])
    })

    it("only active column mapped → works without member", () => {
        const mappingActiveOnly: ColumnMapping = { ...mapping, active: 5 }
        const data = [["Alexandra", "Empain", "0498571931", "a@b.com", "", "active"]]
        const players = parsePlayersFromSheet(data, mappingActiveOnly)
        expect(players[0].status).toEqual(["active"])
    })

    it("active/member columns take priority over status column", () => {
        const mappingBoth: ColumnMapping = { ...mapping, active: 5, member: 6, status: 7 }
        const data = [["Alexandra", "Empain", "0498571931", "a@b.com", "", "active", "yes", "statut_ignoré"]]
        const players = parsePlayersFromSheet(data, mappingBoth)
        expect(players[0].status).toEqual(["active", "member"])
    })
})

describe("parseBooleanCell", () => {
    it("boolean true → true", () => {
        expect(parseBooleanCell(true)).toBe(true)
    })

    it("boolean false → false", () => {
        expect(parseBooleanCell(false)).toBe(false)
    })

    it("number 1 → true", () => {
        expect(parseBooleanCell(1)).toBe(true)
    })

    it("number 0 → false", () => {
        expect(parseBooleanCell(0)).toBe(false)
    })

    it('"active" → true', () => {
        expect(parseBooleanCell("active")).toBe(true)
    })

    it('"inactive" → false', () => {
        expect(parseBooleanCell("inactive")).toBe(false)
    })

    it('"yes" → true', () => {
        expect(parseBooleanCell("yes")).toBe(true)
    })

    it('"no" → false', () => {
        expect(parseBooleanCell("no")).toBe(false)
    })

    it('"oui" → true', () => {
        expect(parseBooleanCell("oui")).toBe(true)
    })

    it('"non" → false', () => {
        expect(parseBooleanCell("non")).toBe(false)
    })

    it('"x" → true', () => {
        expect(parseBooleanCell("x")).toBe(true)
    })

    it('"" → false', () => {
        expect(parseBooleanCell("")).toBe(false)
    })

    it('"false" → false', () => {
        expect(parseBooleanCell("false")).toBe(false)
    })

    it('"0" → false', () => {
        expect(parseBooleanCell("0")).toBe(false)
    })

    it('"-" → false', () => {
        expect(parseBooleanCell("-")).toBe(false)
    })

    it("case-insensitive: ACTIVE → true", () => {
        expect(parseBooleanCell("ACTIVE")).toBe(true)
    })

    it("case-insensitive: INACTIVE → false", () => {
        expect(parseBooleanCell("INACTIVE")).toBe(false)
    })
})

describe("fuzzyMatchColumns — active/member", () => {
    it("matches 'active' and 'member' columns (format réel)", () => {
        const headers = ["prenom", "nom", "active", "member"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.active).toBe(2)
        expect(mapping.member).toBe(3)
    })

    it("matches 'actif' as active column", () => {
        const headers = ["prenom", "nom", "actif", "membre"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.active).toBe(2)
    })

    it("matches 'membre' (français) as member column", () => {
        const headers = ["prenom", "nom", "membre"]
        const mapping = fuzzyMatchColumns(headers)
        expect(mapping.member).toBe(2)
    })
})

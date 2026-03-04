import { describe, it, expect } from "vitest"
import { matchResultSchema } from "./matchResult.schema"

describe("matchResultSchema", () => {
    it("accepts simple score '3-1'", () => {
        const result = matchResultSchema.safeParse({ score: "3-1" })
        expect(result.success).toBe(true)
    })

    it("accepts multi-set score '15-12 15-8'", () => {
        const result = matchResultSchema.safeParse({ score: "15-12 15-8" })
        expect(result.success).toBe(true)
    })

    it("accepts three-set score '15-12 8-15 15-10'", () => {
        const result = matchResultSchema.safeParse({ score: "15-12 8-15 15-10" })
        expect(result.success).toBe(true)
    })

    it("accepts 'WO' for walkover", () => {
        const result = matchResultSchema.safeParse({ score: "WO" })
        expect(result.success).toBe(true)
    })

    it("rejects empty score", () => {
        const result = matchResultSchema.safeParse({ score: "" })
        expect(result.success).toBe(false)
    })

    it("rejects invalid format (letters)", () => {
        const result = matchResultSchema.safeParse({ score: "abc" })
        expect(result.success).toBe(false)
    })

    it("rejects score with missing part", () => {
        const result = matchResultSchema.safeParse({ score: "3-" })
        expect(result.success).toBe(false)
    })

    it("accepts score '0-3'", () => {
        const result = matchResultSchema.safeParse({ score: "0-3" })
        expect(result.success).toBe(true)
    })
})

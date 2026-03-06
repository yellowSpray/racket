import { describe, it, expect, vi } from "vitest"
import { extractErrorMessage, handleHookError } from "./handleHookError"

describe("extractErrorMessage", () => {
    it("should extract message from Error instance", () => {
        expect(extractErrorMessage(new Error("test error"))).toBe("test error")
    })

    it("should extract message from object with message property", () => {
        expect(extractErrorMessage({ message: "supabase error" })).toBe("supabase error")
    })

    it("should return string directly", () => {
        expect(extractErrorMessage("plain string")).toBe("plain string")
    })

    it("should return fallback for unknown types", () => {
        expect(extractErrorMessage(42)).toBe("Erreur inconnue")
        expect(extractErrorMessage(null)).toBe("Erreur inconnue")
        expect(extractErrorMessage(undefined)).toBe("Erreur inconnue")
    })
})

describe("handleHookError", () => {
    it("should call setError with extracted message", () => {
        const setError = vi.fn()
        handleHookError(new Error("fetch failed"), setError)
        expect(setError).toHaveBeenCalledWith("fetch failed")
    })

    it("should log with context when provided", () => {
        const setError = vi.fn()
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        const err = new Error("db error")

        handleHookError(err, setError, "useGroups")

        expect(spy).toHaveBeenCalledWith("[useGroups]", "db error", err)
        expect(setError).toHaveBeenCalledWith("db error")
        spy.mockRestore()
    })

    it("should not log when no context provided", () => {
        const setError = vi.fn()
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})

        handleHookError("simple error", setError)

        expect(spy).not.toHaveBeenCalled()
        expect(setError).toHaveBeenCalledWith("simple error")
        spy.mockRestore()
    })

    it("should handle supabase-style error objects", () => {
        const setError = vi.fn()
        handleHookError({ message: "relation not found" }, setError)
        expect(setError).toHaveBeenCalledWith("relation not found")
    })
})

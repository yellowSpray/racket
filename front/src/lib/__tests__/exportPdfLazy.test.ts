import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * html2canvas et jsPDF pesent ensemble plus de 360 ko. Importes statiquement,
 * ils partaient dans le morceau de la page des tableaux, qu'ils soient
 * utilises ou non. Ce module differe leur chargement jusqu'au clic sur Export.
 */

const exportTablesToPdf = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const importCount = vi.hoisted(() => ({ value: 0 }))

vi.mock("../exportPdf", () => {
    importCount.value++
    return { exportTablesToPdf }
})

import { exportTablesToPdfLazy } from "../exportPdfLazy"

describe("exportTablesToPdfLazy", () => {
    beforeEach(() => {
        exportTablesToPdf.mockClear()
        exportTablesToPdf.mockImplementation(() => Promise.resolve())
    })

    it("ne charge rien tant qu on ne l appelle pas", () => {
        // Le seul import du module ne doit pas tirer le moteur PDF.
        expect(importCount.value).toBe(0)
        expect(exportTablesToPdf).not.toHaveBeenCalled()
    })

    it("charge le moteur et lui transmet le conteneur et le nom de fichier", async () => {
        const container = document.createElement("div")

        await exportTablesToPdfLazy(container, "tableaux.pdf")

        expect(importCount.value).toBe(1)
        expect(exportTablesToPdf).toHaveBeenCalledWith(container, "tableaux.pdf")
    })

    it("laisse remonter l echec du moteur", async () => {
        // L'appelant affiche une erreur : elle ne doit pas etre avalee ici.
        exportTablesToPdf.mockRejectedValueOnce(new Error("canvas indisponible"))

        await expect(
            exportTablesToPdfLazy(document.createElement("div"), "tableaux.pdf"),
        ).rejects.toThrow("canvas indisponible")
    })

    it("ne recharge pas le moteur au second appel", async () => {
        // L'import dynamique est mis en cache par le runtime.
        const before = importCount.value

        await exportTablesToPdfLazy(document.createElement("div"), "a.pdf")
        await exportTablesToPdfLazy(document.createElement("div"), "b.pdf")

        expect(importCount.value).toBe(before)
        expect(exportTablesToPdf).toHaveBeenCalledTimes(2)
    })
})

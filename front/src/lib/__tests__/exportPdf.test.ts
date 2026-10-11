import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Verifie que l'export attend le CSS du document clone avant que
 * html2canvas ne dessine. html2canvas attend la promesse renvoyee par onclone.
 */

type OnClone = (doc: Document) => unknown
const options = vi.hoisted(() => ({ onclone: undefined as OnClone | undefined }))

vi.mock("html2canvas-pro", () => ({
    default: vi.fn((_el: HTMLElement, opts: { onclone: OnClone }) => {
        options.onclone = opts.onclone
        const canvas = document.createElement("canvas")
        canvas.toDataURL = () => "data:image/jpeg;base64,"
        return Promise.resolve(canvas)
    }),
}))

vi.mock("jspdf", () => ({
    jsPDF: vi.fn(function () {
        return { addPage: vi.fn(), addImage: vi.fn(), save: vi.fn() }
    }),
}))

import { exportTablesToPdf } from "../exportPdf"

async function estResolue(promesse: Promise<unknown>): Promise<boolean> {
    let resolue = false
    promesse.then(() => { resolue = true })
    for (let i = 0; i < 10; i++) await Promise.resolve()
    return resolue
}

describe("exportTablesToPdf", () => {
    beforeEach(() => {
        options.onclone = undefined
        vi.spyOn(console, "log").mockImplementation(() => {})
    })

    it("fait attendre html2canvas jusqu au chargement du CSS dans le clone", async () => {
        const container = document.createElement("div")
        const table = document.createElement("div")
        table.setAttribute("data-draw-table", "")
        container.appendChild(table)

        await exportTablesToPdf(container, "tableaux.pdf")
        expect(options.onclone).toBeTypeOf("function")

        const clone = document.implementation.createHTMLDocument("clone")
        const lien = clone.createElement("link")
        lien.rel = "stylesheet"
        lien.href = "/assets/index.css"
        clone.head.appendChild(lien)

        const attente = Promise.resolve(options.onclone!(clone))
        expect(await estResolue(attente)).toBe(false)

        lien.dispatchEvent(new Event("load"))
        expect(await estResolue(attente)).toBe(true)
    })
})

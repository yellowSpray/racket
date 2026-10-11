import { describe, it, expect, vi, afterEach } from "vitest"
import { attendreStyles } from "../attendreStyles"

/**
 * html2canvas recopie la page dans une iframe et y insere le <link> du CSS
 * apres avoir deja declare l'iframe prete. Sans attente explicite, la capture
 * peut partir avant que la feuille soit chargee et sortir sans aucun style.
 */

function documentAvecLien(): { doc: Document; lien: HTMLLinkElement } {
    const doc = document.implementation.createHTMLDocument("clone")
    const lien = doc.createElement("link")
    lien.rel = "stylesheet"
    lien.href = "/assets/index.css"
    doc.head.appendChild(lien)
    return { doc, lien }
}

/** Indique si la promesse est resolue apres vidage de la file des microtaches. */
async function estResolue(promesse: Promise<unknown>): Promise<boolean> {
    let resolue = false
    promesse.then(() => { resolue = true })
    for (let i = 0; i < 10; i++) await Promise.resolve()
    return resolue
}

describe("attendreStyles", () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it("se resout tout de suite sans feuille de style externe", async () => {
        const doc = document.implementation.createHTMLDocument("clone")

        expect(await estResolue(attendreStyles(doc))).toBe(true)
    })

    it("attend le chargement de la feuille de style", async () => {
        const { doc, lien } = documentAvecLien()
        const attente = attendreStyles(doc)

        expect(await estResolue(attente)).toBe(false)

        lien.dispatchEvent(new Event("load"))
        expect(await estResolue(attente)).toBe(true)
    })

    it("ne bloque pas si la feuille echoue a charger", async () => {
        // Mieux vaut une capture sans style qu'un export qui ne finit jamais.
        const { doc, lien } = documentAvecLien()
        const attente = attendreStyles(doc)

        lien.dispatchEvent(new Event("error"))
        expect(await estResolue(attente)).toBe(true)
    })

    it("abandonne l attente apres le delai maximum", async () => {
        vi.useFakeTimers()
        const { doc } = documentAvecLien()
        const attente = attendreStyles(doc, 5000)

        await vi.advanceTimersByTimeAsync(4999)
        expect(await estResolue(attente)).toBe(false)

        await vi.advanceTimersByTimeAsync(1)
        expect(await estResolue(attente)).toBe(true)
    })

    it("ignore une feuille deja chargee", async () => {
        const { doc, lien } = documentAvecLien()
        Object.defineProperty(lien, "sheet", { value: {} })

        expect(await estResolue(attendreStyles(doc))).toBe(true)
    })

    it("attend les polices une fois le CSS charge", async () => {
        // Nunito est declaree dans le CSS : sa demande ne part qu'apres le chargement.
        const { doc, lien } = documentAvecLien()
        let libererPolices!: () => void
        const ready = new Promise<void>(resolve => { libererPolices = resolve })
        Object.defineProperty(doc, "fonts", { value: { ready } })

        const attente = attendreStyles(doc)
        lien.dispatchEvent(new Event("load"))
        expect(await estResolue(attente)).toBe(false)

        libererPolices()
        expect(await estResolue(attente)).toBe(true)
    })
})

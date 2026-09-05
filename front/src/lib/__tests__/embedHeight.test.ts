import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { EMBED_HEIGHT_MESSAGE, publishEmbedHeight, buildEmbedResizeScript } from "../embedHeight"

/**
 * Un iframe n'a pas de hauteur automatique : sans mesure, la page hote doit
 * en deviner une, et on obtient soit une barre de defilement, soit du vide.
 * Le cadre annonce donc sa hauteur a la page qui l'accueille.
 */
describe("publishEmbedHeight", () => {
    let postMessage: ReturnType<typeof vi.fn>

    beforeEach(() => {
        postMessage = vi.fn()
        vi.stubGlobal("parent", { postMessage })
    })

    afterEach(() => vi.unstubAllGlobals())

    it("annonce la hauteur mesuree", () => {
        publishEmbedHeight(742)

        expect(postMessage).toHaveBeenCalledWith(
            { type: EMBED_HEIGHT_MESSAGE, height: 742 },
            "*",
        )
    })

    it("arrondit au pixel superieur", () => {
        // Une hauteur fractionnaire laisserait un liseré coupé en bas.
        publishEmbedHeight(741.2)

        expect(postMessage).toHaveBeenCalledWith(
            { type: EMBED_HEIGHT_MESSAGE, height: 742 },
            "*",
        )
    })

    it("ne dit rien hors d un cadre", () => {
        // Ouverte directement, la page n'a pas de parent a prevenir.
        vi.stubGlobal("parent", window)

        publishEmbedHeight(500)

        expect(postMessage).not.toHaveBeenCalled()
    })

    it("ignore une hauteur absurde", () => {
        publishEmbedHeight(0)
        publishEmbedHeight(-10)

        expect(postMessage).not.toHaveBeenCalled()
    })
})

describe("buildEmbedResizeScript", () => {
    it("n ecoute que le cadre qu il accompagne", () => {
        // Sans ce filtrage, n'importe quelle page pourrait redimensionner
        // l'iframe en envoyant un message au hasard.
        const script = buildEmbedResizeScript("https://eventfest.app")

        expect(script).toContain("https://eventfest.app")
        expect(script).toContain("e.origin")
        expect(script).toContain(EMBED_HEIGHT_MESSAGE)
    })

    it("produit une balise script complete", () => {
        const script = buildEmbedResizeScript("https://eventfest.app")

        expect(script.startsWith("<script>")).toBe(true)
        expect(script.trimEnd().endsWith("</script>")).toBe(true)
    })
})

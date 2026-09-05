import { describe, it, expect } from "vitest"
import { buildEmbedUrl, buildEmbedSnippet } from "../embedSnippet"

const TOKEN = "864bc9e6-0590-4770-8a36-3de2176bc5ef"

describe("buildEmbedUrl", () => {
    it("compose l adresse publique a partir de l origine", () => {
        expect(buildEmbedUrl("https://eventfest.app", TOKEN))
            .toBe(`https://eventfest.app/embed/tableaux/${TOKEN}`)
    })

    it("ne double pas la barre oblique", () => {
        expect(buildEmbedUrl("https://eventfest.app/", TOKEN))
            .toBe(`https://eventfest.app/embed/tableaux/${TOKEN}`)
    })

    it("epingle une serie quand on lui en donne une", () => {
        // Sans numero, l'embed suit la serie active. Avec, il la fige.
        expect(buildEmbedUrl("https://eventfest.app", TOKEN, 3))
            .toBe(`https://eventfest.app/embed/tableaux/${TOKEN}?serie=3`)
    })

    it("ignore un numero de serie absurde", () => {
        // Un champ vide ou un zero ne doit pas produire ?serie=0.
        expect(buildEmbedUrl("https://eventfest.app", TOKEN, 0)).not.toContain("serie")
        expect(buildEmbedUrl("https://eventfest.app", TOKEN, -2)).not.toContain("serie")
    })

    it("rend une chaine vide sans jeton", () => {
        expect(buildEmbedUrl("https://eventfest.app", "")).toBe("")
    })
})

describe("buildEmbedSnippet", () => {
    it("produit une balise iframe complete", () => {
        const html = buildEmbedSnippet("https://eventfest.app", TOKEN, { height: 900 })

        expect(html).toContain(`src="https://eventfest.app/embed/tableaux/${TOKEN}"`)
        expect(html).toContain('height="900"')
        expect(html).toContain('width="100%"')
        expect(html).toContain("<iframe")
        expect(html).toContain("</iframe>")
    })

    it("nomme le cadre pour les lecteurs d ecran", () => {
        // Un iframe sans titre est signale par tout audit d accessibilite.
        const html = buildEmbedSnippet("https://eventfest.app", TOKEN, { title: "Tableaux Mixed" })

        expect(html).toContain('title="Tableaux Mixed"')
    })

    it("echappe les guillemets du titre", () => {
        // Un nom d evenement contenant un guillemet casserait la balise.
        const html = buildEmbedSnippet("https://eventfest.app", TOKEN, { title: 'Tournoi "Elite"' })

        expect(html).toContain("&quot;Elite&quot;")
        expect(html).not.toMatch(/title="Tournoi "Elite""/)
    })

    it("reprend le numero de serie dans l adresse", () => {
        const html = buildEmbedSnippet("https://eventfest.app", TOKEN, { roundNumber: 2 })

        expect(html).toContain("?serie=2")
    })

    it("rend une chaine vide sans jeton", () => {
        expect(buildEmbedSnippet("https://eventfest.app", "")).toBe("")
    })

    it("n ajoute aucun script par defaut", () => {
        const html = buildEmbedSnippet("https://eventfest.app", TOKEN)

        expect(html).not.toContain("<script")
    })

    it("ajoute le script de hauteur quand on le demande", () => {
        // Sans lui, la hauteur reste figee : barre de defilement ou vide.
        const html = buildEmbedSnippet("https://eventfest.app", TOKEN, { autoResize: true })

        expect(html).toContain("<iframe")
        expect(html).toContain("<script>")
        expect(html).toContain("addEventListener")
    })
})

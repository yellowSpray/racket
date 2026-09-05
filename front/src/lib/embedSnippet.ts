/**
 * Code d'integration des tableaux sur un site exterieur.
 *
 * L'adresse porte le jeton d'integration de l'evenement, distinct du jeton
 * d'invitation : le couper arrete la diffusion publique sans casser les
 * invitations. Sans numero de serie, la page suit la serie active, ce qui
 * permet au club de coller le code une seule fois.
 */

import { buildEmbedResizeScript } from "@/lib/embedHeight"

const EMBED_PATH = "/embed/tableaux"

export interface EmbedSnippetOptions {
    /** Serie a epingler. Omis, l'embed suit la serie active. */
    roundNumber?: number
    /** Hauteur de depart en pixels, avant que le cadre annonce la sienne. */
    height?: number
    /** Titre du cadre, lu par les lecteurs d'ecran. */
    title?: string
    /**
     * Ajoute le script qui ajuste la hauteur du cadre sur son contenu.
     * Sans lui, la hauteur reste celle de `height`, avec une barre de
     * defilement ou du vide selon le nombre de boxes.
     */
    autoResize?: boolean
}

/** Echappe ce qui casserait un attribut HTML entre guillemets doubles. */
function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

export function buildEmbedUrl(origin: string, token: string, roundNumber?: number): string {
    if (!token) return ""

    const base = `${origin.replace(/\/+$/, "")}${EMBED_PATH}/${token}`

    // Un numero absent, nul ou negatif ne doit pas produire « ?serie=0 ».
    return roundNumber && roundNumber > 0 ? `${base}?serie=${roundNumber}` : base
}

export function buildEmbedSnippet(
    origin: string,
    token: string,
    options: EmbedSnippetOptions = {},
): string {
    const url = buildEmbedUrl(origin, token, options.roundNumber)
    if (!url) return ""

    const height = options.height ?? 800
    const title = escapeAttribute(options.title ?? "Tableaux")

    const iframe = [
        `<iframe src="${url}"`,
        `        title="${title}"`,
        `        width="100%"`,
        `        height="${height}"`,
        `        style="border:0"`,
        `        loading="lazy"></iframe>`,
    ].join("\n")

    if (!options.autoResize) return iframe

    return `${iframe}\n${buildEmbedResizeScript(origin)}`
}

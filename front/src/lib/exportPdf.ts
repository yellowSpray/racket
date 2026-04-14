import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"

/**
 * Exporte tous les éléments [data-draw-table] du container vers un PDF A4 paysage, un tableau par page.
 */
export async function exportTablesToPdf(container: HTMLElement, filename: string): Promise<void> {
    const tables = container.querySelectorAll<HTMLElement>("[data-draw-table]")
    console.log(`[exportPdf] Démarrage — ${tables.length} tableau(x) trouvé(s), fichier : ${filename}`)
    if (tables.length === 0) {
        console.warn("[exportPdf] Aucun tableau [data-draw-table] trouvé, export annulé")
        return
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
    const pdfWidth = 841.89
    const pdfHeight = 595.28
    const margin = 30
    const contentWidth = pdfWidth - margin * 2
    const contentHeight = pdfHeight - margin * 2

    for (let i = 0; i < tables.length; i++) {
        if (i > 0) pdf.addPage()

        const table = tables[i]
        console.log(`[exportPdf] Tableau ${i + 1}/${tables.length} — capture en cours...`)

        // Clone hors-écran pour éviter le scroll/rognage du conteneur
        const clone = table.cloneNode(true) as HTMLElement
        clone.style.position = "absolute"
        clone.style.left = "-9999px"
        clone.style.top = "0"
        clone.style.width = `${table.scrollWidth}px`
        // Hauteur forcée : sans ça, les h-full se résolvent à "auto" hors contexte et les lignes s'expandent
        clone.style.height = `${table.offsetHeight}px`
        clone.style.background = "white"
        document.body.appendChild(clone)

        try {
            const canvas = await html2canvas(clone, {
                scale: 4,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                onclone: (clonedDoc) => {
                    // Injecte les variables CSS de :root pour que Tailwind 4 résolve correctement ses couleurs
                    const rootStyle = getComputedStyle(document.documentElement)
                    const cssVars = Array.from(rootStyle).filter(p => p.startsWith('--'))
                    const style = clonedDoc.createElement('style')
                    style.textContent = `:root { ${cssVars.map(v => `${v}: ${rootStyle.getPropertyValue(v).trim()}`).join('; ')} }`
                    clonedDoc.head.appendChild(style)
                },
            })
            console.log(`[exportPdf] Tableau ${i + 1}/${tables.length} — canvas ${canvas.width}×${canvas.height}px`)

            const imgData = canvas.toDataURL("image/jpeg", 1.0)
            // Division par 4 pour retrouver la taille logique en pt (canvas capturé à scale 4)
            const imgWidth = canvas.width / 4
            const imgHeight = canvas.height / 4

            const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight)
            const scaleFactor = 0.7
            const scaledWidth = imgWidth * ratio * scaleFactor
            const scaledHeight = imgHeight * ratio * scaleFactor

            // Centrage dans la zone utile
            const x = margin + (contentWidth - scaledWidth) / 2
            const y = margin + (contentHeight - scaledHeight) / 2

            pdf.addImage(imgData, "JPEG", x, y, scaledWidth, scaledHeight)
            console.log(`[exportPdf] Tableau ${i + 1}/${tables.length} — ajouté au PDF (${scaledWidth.toFixed(0)}×${scaledHeight.toFixed(0)}pt)`)
        } finally {
            document.body.removeChild(clone)
        }
    }

    console.log(`[exportPdf] Sauvegarde du fichier : ${filename}`)
    pdf.save(filename)
    console.log("[exportPdf] Export terminé")
}

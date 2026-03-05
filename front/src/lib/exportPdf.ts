import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"

export async function exportTablesToPdf(container: HTMLElement, filename: string): Promise<void> {
    const tables = container.querySelectorAll<HTMLElement>("[data-draw-table]")
    if (tables.length === 0) return

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
    const pdfWidth = 841.89
    const pdfHeight = 595.28
    const margin = 30

    const contentWidth = pdfWidth - margin * 2
    const contentHeight = pdfHeight - margin * 2

    for (let i = 0; i < tables.length; i++) {
        if (i > 0) pdf.addPage()

        const table = tables[i]

        // Cloner l'élément hors du scroll pour une capture propre
        const clone = table.cloneNode(true) as HTMLElement
        clone.style.position = "absolute"
        clone.style.left = "-9999px"
        clone.style.top = "0"
        clone.style.width = `${table.scrollWidth}px`
        clone.style.background = "white"
        document.body.appendChild(clone)

        try {
            const canvas = await html2canvas(clone, {
                scale: 4,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            })

            const imgData = canvas.toDataURL("image/jpeg", 1.0)
            const imgWidth = canvas.width / 4
            const imgHeight = canvas.height / 4
            const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight)
            const scaledWidth = imgWidth * ratio
            const scaledHeight = imgHeight * ratio

            const x = margin + (contentWidth - scaledWidth) / 2
            const y = margin + (contentHeight - scaledHeight) / 2

            pdf.addImage(imgData, "JPEG", x, y, scaledWidth, scaledHeight)
        } finally {
            document.body.removeChild(clone)
        }
    }

    pdf.save(filename)
}

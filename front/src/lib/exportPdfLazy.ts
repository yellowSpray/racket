/**
 * Chargement differe du moteur d'export PDF.
 *
 * `exportPdf` tire html2canvas et jsPDF, plus de 360 ko a eux deux. Importe
 * statiquement, ce poids partait dans le morceau de la page des tableaux et
 * etait telecharge par tous les visiteurs, y compris ceux qui ne cliquent
 * jamais sur Export. L'import dynamique le sort du chargement de la page et
 * le reporte au premier clic.
 *
 * Le runtime met le module en cache : les appels suivants ne rechargent rien.
 * Les erreurs du moteur remontent telles quelles, l'appelant les affiche.
 */
export async function exportTablesToPdfLazy(
    container: HTMLElement,
    filename: string,
): Promise<void> {
    const { exportTablesToPdf } = await import("./exportPdf")
    return exportTablesToPdf(container, filename)
}

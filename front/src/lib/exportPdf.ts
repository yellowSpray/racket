// html2canvas-pro : bibliothèque qui "photographie" un élément HTML en le dessinant
// sur un <canvas> (une surface de dessin 2D du navigateur). La variante "pro" gère
// mieux les couleurs modernes (oklch, etc.) que la version originale.
import html2canvas from "html2canvas-pro"

// jsPDF : bibliothèque qui crée et manipule des fichiers PDF directement dans le
// navigateur, sans passer par un serveur.
import { jsPDF } from "jspdf"

/**
 * Exporte tous les tableaux marqués [data-draw-table] contenus dans `container`
 * vers un fichier PDF A4 paysage, un tableau par page, centré.
 *
 * Flux général :
 *  1. On récupère tous les éléments HTML portant l'attribut data-draw-table.
 *  2. On crée un document PDF vide en mode paysage A4.
 *  3. Pour chaque tableau :
 *     a. On le clone hors de l'écran pour ne pas perturber l'affichage.
 *     b. html2canvas capture ce clone et produit un <canvas> (image bitmap).
 *     c. On convertit ce canvas en JPEG base64.
 *     d. On calcule la taille max que peut occuper l'image dans la page (en gardant
 *        les proportions), puis on la centre avec des marges.
 *     e. On insère l'image dans le PDF.
 *     f. On supprime le clone du DOM.
 *  4. On déclenche le téléchargement du fichier PDF.
 *
 * @param container - L'élément HTML racine dans lequel chercher les tableaux.
 *                    Dans AdminDraws, c'est le <div ref={tablesRef}> qui contient
 *                    tous les <DrawTable>.
 * @param filename  - Le nom du fichier PDF téléchargé (ex. "tableaux.pdf").
 */
export async function exportTablesToPdf(container: HTMLElement, filename: string): Promise<void> {

    // querySelectorAll("[data-draw-table]") : parcourt tout le sous-arbre DOM de
    // `container` et retourne une NodeList de tous les éléments qui portent
    // l'attribut HTML data-draw-table (peu importe sa valeur).
    // Dans notre cas, c'est le <div data-draw-table> de chaque <DrawTable>.
    const tables = container.querySelectorAll<HTMLElement>("[data-draw-table]")
    console.log(`[exportPdf] Démarrage — ${tables.length} tableau(x) trouvé(s), fichier : ${filename}`)
    if (tables.length === 0) {
        console.warn("[exportPdf] Aucun tableau [data-draw-table] trouvé, export annulé")
        return
    }

    // Création du document PDF.
    // - orientation "landscape" : page en mode paysage (plus large que haute), adapté
    //   aux tableaux à nombreuses colonnes.
    // - unit "pt" : toutes les mesures seront en points typographiques (1 pt ≈ 0,35 mm).
    // - format "a4" : dimensions standard A4 (841,89 × 595,28 pt en paysage).
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })

    // Dimensions fixes de la page A4 paysage en points.
    // Ces valeurs correspondent exactement au format A4 (297 × 210 mm convertis en pt).
    const pdfWidth = 841.89   // largeur de la page en pt
    const pdfHeight = 595.28  // hauteur de la page en pt

    // Marge intérieure appliquée sur les quatre côtés (en pt).
    // Empêche l'image de toucher les bords de la page.
    const margin = 30

    // Zone utile disponible pour placer une image, après déduction des marges gauche
    // et droite (ou haut et bas).
    const contentWidth = pdfWidth - margin * 2   // 841.89 - 60 = 781.89 pt
    const contentHeight = pdfHeight - margin * 2 // 595.28 - 60 = 535.28 pt

    // Boucle sur chaque tableau trouvé.
    for (let i = 0; i < tables.length; i++) {

        // À partir du 2ème tableau, on ajoute une nouvelle page vierge dans le PDF
        // avant d'y placer l'image. Le 1er tableau va sur la page créée par défaut.
        if (i > 0) pdf.addPage()

        const table = tables[i]
        console.log(`[exportPdf] Tableau ${i + 1}/${tables.length} — capture en cours...`)

        // --- Clonage hors-écran ---
        // On ne capture pas le tableau directement dans la page car il peut être
        // partiellement masqué par le scroll ou rogné par son conteneur.
        // cloneNode(true) duplique l'élément et tous ses enfants (deep clone).
        const clone = table.cloneNode(true) as HTMLElement

        // On place le clone en position absolue très à gauche (x = -9999px) pour
        // qu'il ne soit pas visible par l'utilisateur, tout en restant dans le DOM
        // (nécessaire pour que html2canvas puisse le mesurer et le peindre).
        clone.style.position = "absolute"
        clone.style.left = "-9999px"
        clone.style.top = "0"

        // On force la largeur du clone à celle du contenu défilable du tableau
        // original (scrollWidth), pour que les colonnes ne soient pas compressées.
        clone.style.width = `${table.scrollWidth}px`

        // On force également la hauteur à celle réellement rendue dans le navigateur
        // (offsetHeight). Sans ça, les h-full imbriqués (wrapper → Table) se résolvent
        // à "auto" hors contexte, et chaque ligne s'expande à 3× sa hauteur normale.
        clone.style.height = `${table.offsetHeight}px`

        // Fond blanc explicite : évite les fonds transparents qui rendraient l'image
        // illisible sur le PDF (fond blanc par défaut du PDF).
        clone.style.background = "white"

        // On attache le clone au <body> pour qu'il soit dans le DOM et donc rendu
        // par le navigateur (html2canvas en a besoin pour calculer les styles).
        document.body.appendChild(clone)

        // html2canvas recrée un clone interne — un style inline sur un élément est
        // perdu dans ce processus. On injecte un <style> dans le clone pour qu'il
        // soit embarqué avec lui.
        //
        // Problèmes corrigés :
        //  1. border-collapse: collapse → permet aux <tr> d'avoir un border-b valide
        //     et fusionne les border-x adjacents entre <td> (évite le doublon)
        //  2. border: 1px solid rgb(156,163,175) explicite sur td/th → remplace les
        //     classes Tailwind qui utilisent des variables CSS (--color-gray-400)
        //     que html2canvas ne résout pas toujours correctement
        // const fixStyle = document.createElement("style")
        // fixStyle.textContent = `
        //     tr:first-child td, tr:last-child td { border-bottom: 1px solid rgb(156, 163, 175) !important; }  
        // `
        // clone.appendChild(fixStyle)

        try {
            // --- Capture du clone en canvas ---
            // html2canvas parcourt le DOM du clone, applique les styles CSS calculés
            // et dessine chaque élément sur un <canvas> HTML.
            // Options :
            //   scale: 4  → capture en 4× la résolution d'affichage, ce qui donne une
            //               image très nette dans le PDF (évite le flou à l'impression).
            //   useCORS: true → autorise le chargement d'images hébergées sur d'autres
            //                   origines (ex. avatars Supabase Storage).
            //   logging: false → désactive les logs internes de html2canvas dans la console.
            //   backgroundColor: "#ffffff" → fond blanc si l'élément est transparent.
            const canvas = await html2canvas(clone, {
                scale: 4,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            })
            console.log(`[exportPdf] Tableau ${i + 1}/${tables.length} — canvas ${canvas.width}×${canvas.height}px`)

            // Conversion du canvas en image JPEG encodée en base64.
            // Le second argument (1.0) est la qualité JPEG : 1.0 = qualité maximale,
            // pas de compression avec perte visible.
            const imgData = canvas.toDataURL("image/jpeg", 1.0)

            // Le canvas a été capturé à scale 4, donc ses dimensions en pixels sont
            // 4× les dimensions CSS réelles du tableau. On divise par 4 pour retrouver
            // la taille "logique" en pt (puisque 1 pt CSS ≈ 1 pt PDF ici).
            const imgWidth = canvas.width / 4
            const imgHeight = canvas.height / 4

            // Calcul du ratio de mise à l'échelle pour que l'image tienne dans la zone
            // utile (contentWidth × contentHeight) sans dépasser, et en conservant
            // les proportions (pas de déformation).
            // Math.min prend le facteur le plus contraignant (largeur ou hauteur).
            const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight)

            // Dimensions finales de l'image dans le PDF, après mise à l'échelle.
            const scaledWidth = imgWidth * ratio
            const scaledHeight = imgHeight * ratio

            // Calcul des coordonnées x/y pour centrer l'image dans la zone utile.
            // La marge de départ + la moitié de l'espace restant = centrage parfait.
            const x = margin + (contentWidth - scaledWidth) / 2
            const y = margin + (contentHeight - scaledHeight) / 2

            // Insertion de l'image JPEG dans la page courante du PDF aux coordonnées
            // et dimensions calculées.
            pdf.addImage(imgData, "JPEG", x, y, scaledWidth, scaledHeight)
            console.log(`[exportPdf] Tableau ${i + 1}/${tables.length} — ajouté au PDF (${scaledWidth.toFixed(0)}×${scaledHeight.toFixed(0)}pt)`)
        } finally {
            // Le bloc finally s'exécute qu'il y ait eu une erreur ou non.
            // On supprime toujours le clone du DOM pour ne pas polluer la page.
            document.body.removeChild(clone)
        }
    }

    // Déclenche le téléchargement du fichier PDF dans le navigateur.
    // jsPDF génère le binaire PDF en mémoire et crée un lien de téléchargement
    // temporaire avec le nom de fichier fourni.
    console.log(`[exportPdf] Sauvegarde du fichier : ${filename}`)
    pdf.save(filename)
    console.log("[exportPdf] Export terminé")
}

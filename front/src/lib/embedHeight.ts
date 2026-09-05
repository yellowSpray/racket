/**
 * Hauteur du cadre integre.
 *
 * Un iframe n'a pas de hauteur automatique : la page hote doit la fixer, et
 * elle ne peut pas la deviner. Le cadre mesure donc son contenu et l'annonce
 * a la page qui l'accueille, qui ajuste l'iframe en consequence.
 *
 * Le message est nomme pour que la page hote ignore tout ce qui ne vient pas
 * du cadre, et le script d'accueil verifie l'origine de l'expediteur.
 */

export const EMBED_HEIGHT_MESSAGE = "event-fest:hauteur"

/**
 * Annonce la hauteur du contenu a la page hote.
 * Ne fait rien si la page est ouverte directement, sans cadre.
 */
export function publishEmbedHeight(height: number): void {
    if (!Number.isFinite(height) || height <= 0) return

    // Hors d'un cadre, `parent` est la fenetre elle-meme : personne a prevenir.
    if (typeof window === "undefined" || window.parent === window) return

    window.parent.postMessage(
        { type: EMBED_HEIGHT_MESSAGE, height: Math.ceil(height) },
        "*",
    )
}

/**
 * Script a coller sur le site du club, a cote de l'iframe. Il n'accepte que
 * les messages venant de l'origine du cadre : sans ce filtre, n'importe
 * quelle page pourrait redimensionner l'iframe.
 */
export function buildEmbedResizeScript(origin: string): string {
    const clean = origin.replace(/\/+$/, "")

    return `<script>
window.addEventListener("message", function (e) {
  if (e.origin !== "${clean}") return;
  if (!e.data || e.data.type !== "${EMBED_HEIGHT_MESSAGE}") return;
  var cadres = document.querySelectorAll('iframe[src^="${clean}/embed/"]');
  for (var i = 0; i < cadres.length; i++) {
    if (cadres[i].contentWindow === e.source) cadres[i].style.height = e.data.height + "px";
  }
});
</script>`
}

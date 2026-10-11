/**
 * Attend que les feuilles de style externes d'un document soient chargees,
 * puis que ses polices soient pretes.
 *
 * html2canvas recopie la page dans une iframe et y insere le <link> du CSS
 * apres avoir deja programme l'evenement `load` de l'iframe. Il la declare
 * donc prete sans attendre la feuille, et son attente des polices se termine
 * a vide puisque aucune police n'est encore demandee. En production, ou Vite
 * sert le CSS par un <link>, la capture pouvait partir sans aucun style.
 *
 * Une feuille en echec ou trop lente ne bloque pas l'export : on rend sans
 * elle plutot que de ne jamais finir.
 */
export async function attendreStyles(doc: Document, delaiMaxMs = 5000): Promise<void> {
    const liens = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))

    await Promise.all(
        liens
            .filter(lien => !lien.sheet)
            .map(lien => new Promise<void>(resolve => {
                const timer = setTimeout(resolve, delaiMaxMs)
                const fin = () => {
                    clearTimeout(timer)
                    resolve()
                }
                lien.addEventListener("load", fin, { once: true })
                lien.addEventListener("error", fin, { once: true })
            })),
    )

    // Nunito est declaree dans le CSS : sa demande ne part qu'une fois celui-ci applique.
    await doc.fonts?.ready
}

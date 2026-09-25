import { useEffect, useRef, useState } from "react"

/**
 * La largeur peinte d'un élément, suivie à la trace.
 *
 * Rend `0` tant que rien n'est mesuré, ce qui est aussi le cas sous jsdom, qui
 * ne met rien en page. Les appelants traitent ce zéro comme « on ne sait pas
 * encore » et montrent tout, plutôt que de deviner une largeur.
 *
 * C'est la leçon du 24 septembre appliquée : raisonner sur la largeur du
 * composant et non sur celle de l'écran, dès qu'il vit dans une colonne dont
 * la largeur saute. Ici la colonne de contenu perd 207 px quand la barre
 * latérale se déploie, et aucune media query ne le voit.
 */
export function useLargeur(): [React.RefObject<HTMLDivElement | null>, number] {
    const boite = useRef<HTMLDivElement | null>(null)
    const [largeur, setLargeur] = useState(0)

    useEffect(() => {
        const element = boite.current
        if (!element || typeof ResizeObserver === "undefined") return
        const observateur = new ResizeObserver(([entree]) => {
            setLargeur(Math.round(entree.contentRect.width))
        })
        observateur.observe(element)
        return () => observateur.disconnect()
    }, [])

    return [boite, largeur]
}

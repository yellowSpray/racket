import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router"
import { RechercheContext } from "./RechercheContext"

/** La page vers laquelle Entree emmene quand la page affichee ne cherche pas. */
const PAGE_DES_JOUEURS = "/admin/players"

export function RechercheProvider({ children }: { children: ReactNode }) {
    const [recherche, setRecherche] = useState("")
    const { pathname } = useLocation()
    const navigate = useNavigate()

    const pagesQuiCherchent = useRef(0)
    const garderAuProchainChangement = useRef(false)

    /*
     * Une recherche oubliee filtrerait la page suivante en silence. Elle est
     * donc videe a chaque changement de page, sauf quand c'est elle qui l'a
     * provoque.
     */
    useEffect(() => {
        if (garderAuProchainChangement.current) {
            garderAuProchainChangement.current = false
            return
        }
        setRecherche("")
    }, [pathname])

    const inscrirePage = useCallback(() => {
        pagesQuiCherchent.current += 1
        return () => { pagesQuiCherchent.current -= 1 }
    }, [])

    const lancer = useCallback(() => {
        if (!recherche.trim()) return
        if (pagesQuiCherchent.current > 0) return
        if (!pathname.startsWith("/admin")) return
        garderAuProchainChangement.current = true
        navigate(PAGE_DES_JOUEURS)
    }, [recherche, pathname, navigate])

    const valeur = useMemo(
        () => ({ recherche, setRecherche, lancer, inscrirePage }),
        [recherche, lancer, inscrirePage],
    )

    return <RechercheContext.Provider value={valeur}>{children}</RechercheContext.Provider>
}

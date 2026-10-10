import { createContext, useContext, useEffect } from "react"

/*
 * La recherche du header, partagee avec la page affichee.
 *
 * Le header ecrit, la page lit et filtre ce qu'elle montre : les joueurs, les
 * matchs, les tableaux, les evenements. Il n'y a pas d'index global a
 * interroger, et il n'en faut pas : chaque page sait deja ce qu'elle affiche.
 *
 * Une page qui ne sait rien chercher (le tableau de bord, les emails) ne lit
 * pas la recherche. Entree y emmene vers la liste des joueurs, la recherche
 * comprise, plutot que de ne rien faire.
 *
 * Le fournisseur vit dans `RechercheProvider.tsx`, pour la meme raison que
 * celui du header : Fast Refresh ne recharge a chaud qu'un fichier qui
 * n'exporte que des composants.
 */

export interface RechercheContextType {
    recherche: string
    setRecherche: (valeur: string) => void
    /** Entree dans le champ. */
    lancer: () => void
    /** Tenu par `useRechercheDeLaPage` : la page affichee sait-elle chercher ? */
    inscrirePage: () => () => void
}

/*
 * Sans fournisseur, tout est inerte : les composants testes isolement, ou
 * rendus hors de l'application, n'ont pas a en monter un.
 */
export const RechercheContext = createContext<RechercheContextType>({
    recherche: "",
    setRecherche: () => {},
    lancer: () => {},
    inscrirePage: () => () => {},
})

/** Pour le champ du header. */
export function useRecherche() {
    const { recherche, setRecherche, lancer } = useContext(RechercheContext)
    return { recherche, setRecherche, lancer }
}

/**
 * Pour une page qui filtre ce qu'elle affiche. L'appel suffit a la declarer
 * capable de chercher : Entree n'emmene alors nulle part.
 */
export function useRechercheDeLaPage(): string {
    const { recherche, inscrirePage } = useContext(RechercheContext)
    useEffect(() => inscrirePage(), [inscrirePage])
    return recherche
}

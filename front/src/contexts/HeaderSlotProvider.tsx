import { useCallback, useState, type ReactNode } from "react"
import { HeaderSlotContext } from "./HeaderSlotContext"

/**
 * Le fournisseur des emplacements du header.
 *
 * Il vit a part du contexte et des hooks pour une raison mecanique : un fichier
 * qui exporte un composant ET autre chose n'est plus rechargeable a chaud. Fast
 * Refresh remplace un composant en place, mais il ne sait pas ce que devient un
 * hook deja appele par un autre module, alors il recharge la page entiere.
 *
 * Ce fournisseur enveloppe toute l'application, dans `RootLayout` : le
 * rechargement complet etait donc declenche par la modification de n'importe
 * quel hook du header, et faisait perdre l'ecran en cours.
 *
 * Les deux emplacements sont enregistres par le header lui-meme, qui appelle
 * `registerSlot` et `registerActionsSlot` sur ses propres div. Les pages y
 * injectent ensuite leur contenu par un portail. `hasActions` sert au trait
 * separateur, qui ne doit apparaitre que si la page a effectivement pose des
 * boutons.
 */
export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const [actionsElement, setActionsElement] = useState<HTMLDivElement | null>(null)
  const [hasActions, setHasActions] = useState(false)

  const registerSlot = useCallback((el: HTMLDivElement | null) => setElement(el), [])
  const registerActionsSlot = useCallback((el: HTMLDivElement | null) => setActionsElement(el), [])
  const setHasActionsStable = useCallback((v: boolean) => setHasActions(v), [])

  return (
    <HeaderSlotContext.Provider value={{ element, registerSlot, actionsElement, registerActionsSlot, hasActions, setHasActions: setHasActionsStable }}>
      {children}
    </HeaderSlotContext.Provider>
  )
}

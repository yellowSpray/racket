import { createContext, useContext, useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"

/**
 * Les emplacements du header, et les hooks qui y injectent du contenu.
 *
 * Le header porte deux div vides : une a gauche pour le titre ou le selecteur
 * d'evenement, une a droite pour les boutons d'action. Chaque page y depose ce
 * qu'elle veut par un portail, sans que le header ait a connaitre les pages.
 *
 * Le fournisseur, `HeaderSlotProvider`, est dans son propre fichier. Un fichier
 * qui exporte un composant a cote d'autre chose n'est plus rechargeable a
 * chaud : Fast Refresh recharge alors la page entiere au lieu de remplacer le
 * composant, ce qui faisait perdre l'ecran en cours a chaque modification.
 */

type Ctx = {
  element: HTMLDivElement | null
  registerSlot: (el: HTMLDivElement | null) => void
  actionsElement: HTMLDivElement | null
  registerActionsSlot: (el: HTMLDivElement | null) => void
  hasActions: boolean
  setHasActions: (v: boolean) => void
}

export const HeaderSlotContext = createContext<Ctx>({
  element: null,
  registerSlot: () => {},
  actionsElement: null,
  registerActionsSlot: () => {},
  hasActions: false,
  setHasActions: () => {},
})

export function useHeaderSlotRegister() {
  return useContext(HeaderSlotContext).registerSlot
}

export function useHeaderActionsRegister() {
  const { registerActionsSlot } = useContext(HeaderSlotContext)
  return registerActionsSlot
}

export function useHeaderHasActions() {
  return useContext(HeaderSlotContext).hasActions
}

/** Injecte du contenu (titre, sélecteur…) dans le slot gauche du header. */
export function useHeaderSlot(content: ReactNode): ReactNode {
  const { element } = useContext(HeaderSlotContext)
  if (!element) return null
  return createPortal(content, element)
}

/** Injecte des boutons d'action dans le slot droit du header (affiche la barre séparatrice). */
export function useHeaderActions(content: ReactNode): ReactNode {
  const { actionsElement, setHasActions } = useContext(HeaderSlotContext)

  useEffect(() => {
    setHasActions(true)
    return () => setHasActions(false)
  }, [setHasActions])

  if (!actionsElement) return null
  return createPortal(content, actionsElement)
}

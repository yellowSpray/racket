import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

type Ctx = {
  element: HTMLDivElement | null
  registerSlot: (el: HTMLDivElement | null) => void
  actionsElement: HTMLDivElement | null
  registerActionsSlot: (el: HTMLDivElement | null) => void
  hasActions: boolean
  setHasActions: (v: boolean) => void
}

const HeaderSlotContext = createContext<Ctx>({
  element: null,
  registerSlot: () => {},
  actionsElement: null,
  registerActionsSlot: () => {},
  hasActions: false,
  setHasActions: () => {},
})

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

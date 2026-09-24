import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const chemin = { value: '/auth' }
vi.mock('react-router', () => ({
    useLocation: () => ({ pathname: chemin.value }),
    Outlet: () => <div data-testid="page" />,
}))
vi.mock('@/components/shared/Header', () => ({ default: () => <header /> }))
vi.mock('@/components/shared/Footer', () => ({ default: () => <footer /> }))
vi.mock('@/contexts/EventContext', () => ({ EventProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/contexts/HeaderSlotProvider', () => ({ HeaderSlotProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

import RootLayout from '../RootLayout'

function main(pathname: string) {
    chemin.value = pathname
    const { container } = render(<RootLayout />)
    return container.querySelector('main')!.className
}

describe('RootLayout', () => {
    /*
     * 32 px de chaque cote coutaient 64 des 320 px d'un petit telephone. Les
     * ecrans d'acces prennent la gouttiere de l'application : 16 sur
     * telephone, 32 au-dessus.
     */
    it('resserre la gouttiere des ecrans d\'acces sur telephone', () => {
        const c = main('/auth')
        expect(c).toContain('px-4')
        expect(c).toContain('sm:px-8')
        expect(c).toContain('pt-4')
        expect(c).toContain('sm:pt-8')
    })

    /*
     * Hors de l'application, la page grandit avec son contenu. Bornee par
     * `min-h-0`, elle laissait le formulaire d'inscription deborder sous le
     * pied de page, qui s'affichait par-dessus le bouton Suivant.
     */
    it('laisse les ecrans d\'acces grandir avec leur contenu', () => {
        expect(main('/auth')).not.toContain('min-h-0')
    })

    // L'application, elle, fait defiler ses zones : sa chaine de `min-h-0` reste.
    it('garde la hauteur bornee dans l\'application', () => {
        expect(main('/admin')).toContain('min-h-0')
        expect(main('/admin')).not.toContain('px-4')
    })
})

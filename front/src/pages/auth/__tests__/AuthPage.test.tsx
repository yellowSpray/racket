import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/pages/auth/Login', () => ({
    default: ({ toggle, onForgotPassword, className }: { toggle: () => void; onForgotPassword: () => void; className?: string }) => (
        <div data-testid="login" className={className}>
            <button onClick={toggle}>toggle-login</button>
            <button onClick={onForgotPassword}>oubli</button>
        </div>
    ),
}))

vi.mock('@/pages/auth/Register', () => ({
    default: ({ toggle, className }: { toggle: () => void; className?: string }) => (
        <div data-testid="register" className={className}><button onClick={toggle}>toggle-register</button></div>
    ),
}))

vi.mock('@/pages/auth/ForgotPassword', () => ({
    default: ({ className }: { className?: string }) => <div data-testid="forgot" className={className} />,
}))

vi.mock('motion/react', () => ({
    motion: new Proxy({}, {
        get: (_target: unknown, prop: string) => {
            return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
                const Element = prop as React.ElementType
                const domProps: Record<string, unknown> = {}
                for (const [key, value] of Object.entries(props)) {
                    if (!['initial', 'animate', 'whileInView', 'viewport', 'variants', 'custom', 'transition', 'layout', 'exit'].includes(key)) {
                        domProps[key] = value
                    }
                }
                return <Element {...domProps}>{children}</Element>
            }
        }
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import Auth from '../AuthPage'

describe('AuthPage', () => {
    it('renders both Login and Register components', () => {
        render(<Auth />)
        expect(screen.getByTestId('login')).toBeInTheDocument()
        expect(screen.getByTestId('register')).toBeInTheDocument()
    })

    it('toggle mechanism works when clicking toggle buttons', () => {
        render(<Auth />)

        const loginToggle = screen.getByText('toggle-login')
        fireEvent.click(loginToggle)

        // After toggle, both components should still be rendered
        expect(screen.getByTestId('login')).toBeInTheDocument()
        expect(screen.getByTestId('register')).toBeInTheDocument()

        const registerToggle = screen.getByText('toggle-register')
        fireEvent.click(registerToggle)

        expect(screen.getByTestId('login')).toBeInTheDocument()
        expect(screen.getByTestId('register')).toBeInTheDocument()
    })

    /*
     * Sous 1024 px les deux formulaires ne tiennent plus cote a cote : on n'en
     * montre qu'un, celui qu'on a choisi. Au-dessus, les deux restent dans la
     * page et l'image glisse pour cacher l'autre, comme avant.
     */
    describe('sous 1024 px', () => {
        const CACHE = 'max-lg:hidden'

        it('ne montre que la connexion au depart', () => {
            render(<Auth />)
            expect(screen.getByTestId('login').className).not.toContain(CACHE)
            expect(screen.getByTestId('register').className).toContain(CACHE)
        })

        it('ne montre que l\'inscription une fois choisie', () => {
            render(<Auth />)
            fireEvent.click(screen.getByText('toggle-login'))
            expect(screen.getByTestId('login').className).toContain(CACHE)
            expect(screen.getByTestId('register').className).not.toContain(CACHE)
        })

        it('ne montre que le mot de passe oublie quand on le demande', () => {
            render(<Auth />)
            fireEvent.click(screen.getByText('oubli'))
            expect(screen.getByTestId('forgot').className).not.toContain(CACHE)
            expect(screen.getByTestId('register').className).toContain(CACHE)
        })

        it('donne a chaque formulaire toute la largeur, la moitie au-dessus', () => {
            render(<Auth />)
            for (const id of ['login', 'register']) {
                expect(screen.getByTestId(id).className).toContain('w-full')
                expect(screen.getByTestId(id).className).toContain('lg:w-1/2')
            }
        })

        // L'image qui glisse n'a de sens qu'a cote de deux formulaires.
        it('range l\'image glissante et pose un bandeau a la place', () => {
            const { container } = render(<Auth />)
            const bandeau = container.querySelector('[data-bandeau-acces]')!
            expect(bandeau.className).toContain('lg:hidden')
            expect(bandeau.querySelector('img')).toHaveAttribute('alt', '')
            // Il n'est affiche que sous 1024 : au-dessus, il se contente de la plus petite image.
            expect(bandeau.querySelector('source')!.getAttribute('sizes')).toMatch(/^\(min-width: 1024px\) 1px, /)
            const glissante = container.querySelector('[data-image-glissante]')!
            expect(glissante.className).toContain('hidden')
            expect(glissante.className).toContain('lg:block')
            /*
             * L'image couvre sa moitie en hauteur : paysage 16/9 dans un panneau
             * portrait, elle s'affiche a ~1.78 fois la hauteur de la fenetre.
             * Sous 1024 elle est cachee et prend la plus petite declinaison.
             */
            expect(glissante.querySelector('source')!.getAttribute('sizes')).toBe('(min-width: 1024px) 178vh, 1px')
        })
    })
})

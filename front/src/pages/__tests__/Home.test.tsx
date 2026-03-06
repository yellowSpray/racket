import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-router', () => ({
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
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

vi.mock('@/components/ui/logo', () => ({
    default: () => <span data-testid="logo">Logo</span>,
}))

import Home from '../Home'

describe('Home', () => {
    it('renders the hero title "L\'organisation de vos boxes,"', () => {
        render(<Home />)
        expect(screen.getByText(/L'organisation de vos boxes,/)).toBeInTheDocument()
    })

    it('renders "en un clic." primary text', () => {
        render(<Home />)
        expect(screen.getByText('en un clic.')).toBeInTheDocument()
    })

    it('renders all 4 feature titles', () => {
        render(<Home />)
        expect(screen.getByText('Gestion des groupes')).toBeInTheDocument()
        expect(screen.getByText('Tirage automatique')).toBeInTheDocument()
        expect(screen.getByText('Planning des matchs')).toBeInTheDocument()
        expect(screen.getByText('Classement en direct')).toBeInTheDocument()
    })

    it('renders all 3 step titles', () => {
        render(<Home />)
        expect(screen.getByText('Créez votre événement')).toBeInTheDocument()
        expect(screen.getByText('Inscrivez les joueurs')).toBeInTheDocument()
        expect(screen.getByText('Lancez vos boxes')).toBeInTheDocument()
    })

    it('has CTA links to "/auth"', () => {
        render(<Home />)
        const authLinks = screen.getAllByRole('link').filter(
            (link) => link.getAttribute('href') === '/auth'
        )
        expect(authLinks.length).toBeGreaterThan(0)
    })
})

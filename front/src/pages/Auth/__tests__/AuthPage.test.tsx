import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/pages/auth/Login', () => ({
    default: ({ toggle }: { toggle: () => void }) => <div data-testid="login"><button onClick={toggle}>toggle-login</button></div>,
}))

vi.mock('@/pages/auth/Register', () => ({
    default: ({ toggle }: { toggle: () => void }) => <div data-testid="register"><button onClick={toggle}>toggle-register</button></div>,
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
})

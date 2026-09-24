import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { mockNavigate, mockSignIn, mockAuthValues, mockHandleError, mockClearError } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockSignIn: vi.fn(),
    mockHandleError: vi.fn(),
    mockClearError: vi.fn(),
    mockAuthValues: {
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        session: null,
        user: null,
        signOut: vi.fn(),
    },
}))

vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => mockAuthValues,
}))

vi.mock('@/lib/supabaseClient', () => ({
    supabase: {
        auth: {
            signInWithPassword: mockSignIn,
        }
    }
}))

vi.mock('@/hooks/useErrorHandler', () => ({
    useErrorHandler: () => ({
        handleError: mockHandleError,
        clearError: mockClearError,
        error: null,
    }),
}))

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}))

import Login from '../Login'

describe('Login', () => {
    const mockToggle = vi.fn()
    const mockForgotPassword = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        mockSignIn.mockResolvedValue({ error: null })
    })

    it('renders "Connectez-vous" title', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        expect(screen.getByText('Connectez-vous')).toBeInTheDocument()
    })

    it('renders form with email and password fields', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument()
        expect(screen.getByText('Email')).toBeInTheDocument()
        expect(screen.getByText('Mot de passe')).toBeInTheDocument()
    })

    it('renders "Se connecter" submit button', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    })

    it('calls handleError when login fails', async () => {
        const loginError = { message: 'Invalid credentials' }
        mockSignIn.mockResolvedValue({ error: loginError })

        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)

        fireEvent.change(screen.getByPlaceholderText('email@example.com'), { target: { value: 'test@example.com' } })
        fireEvent.change(document.getElementById('password_login')!, { target: { value: 'wrongpassword' } })
        fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

        await waitFor(() => {
            expect(mockHandleError).toHaveBeenCalledWith(loginError)
        })
    })

    it('disables button during loading', async () => {
        let resolveSignIn: (value: { error: null }) => void
        mockSignIn.mockReturnValue(new Promise((resolve) => {
            resolveSignIn = resolve
        }))

        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)

        fireEvent.change(screen.getByPlaceholderText('email@example.com'), { target: { value: 'test@example.com' } })
        fireEvent.change(document.getElementById('password_login')!, { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

        await waitFor(() => {
            expect(screen.getByText('Connexion...')).toBeDisabled()
        })

        resolveSignIn!({ error: null })

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Se connecter' })).not.toBeDisabled()
        })
    })

    it('calls supabase.auth.signInWithPassword with correct credentials on submit', async () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)

        fireEvent.change(screen.getByPlaceholderText('email@example.com'), { target: { value: 'user@test.com' } })
        fireEvent.change(document.getElementById('password_login')!, { target: { value: 'mypassword' } })
        fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith({
                email: 'user@test.com',
                password: 'mypassword',
            })
        })
    })

    it('has "S\'inscrire" link that calls toggle', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)

        const signUpButton = screen.getByRole('button', { name: "S'inscrire" })
        fireEvent.click(signUpButton)

        expect(mockToggle).toHaveBeenCalledTimes(1)
    })

    /*
     * Le lien « S'inscrire » vit dans le formulaire. Sans `type="button"` il
     * en etait le bouton d'envoi : le toucher tentait une connexion, et le
     * navigateur affichait « Please fill out this field » sur un champ vide.
     */
    it('bascule vers l\'inscription sans envoyer le formulaire', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        const lien = screen.getByRole('button', { name: "S'inscrire" })
        expect(lien).toHaveAttribute('type', 'button')
        fireEvent.click(lien)
        expect(mockToggle).toHaveBeenCalledOnce()
        expect(mockSignIn).not.toHaveBeenCalled()
    })

    // Le titre de la page, pas un intertitre de carte.
    it('titre la page par un h1', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        expect(screen.getByRole('heading', { level: 1, name: 'Connectez-vous' })).toBeInTheDocument()
    })

    /*
     * Les gestionnaires de mots de passe du telephone ne remplissent que les
     * champs qui disent ce qu'ils attendent. `off` les en empechait.
     */
    it('laisse le telephone remplir l\'email et le mot de passe', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
        expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('autocomplete', 'current-password')
    })

    it('donne aux champs et aux boutons une hauteur de doigt sous 1024 px', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        for (const champ of [screen.getByLabelText('Email'), screen.getByLabelText('Mot de passe')]) {
            expect(champ.className).toContain('h-11')
            expect(champ.className).toContain('lg:h-9')
        }
        for (const nom of ['Se connecter', 'Continuer avec Google']) {
            expect(screen.getByRole('button', { name: nom }).className).toContain('h-11')
        }
    })

    // Une colonne de lecture, pas la moitie d'une moitie d'ecran.
    it('borne le formulaire a 400 px', () => {
        const { container } = render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        const carte = container.querySelector('[data-slot="card"]')!
        expect(carte.className).toContain('w-full')
        expect(carte.className).toContain('max-w-[400px]')
        expect(carte.className).not.toContain('w-1/2')
    })

    /*
     * Les liens textuels faisaient 20 px de haut, sous les 24 du minimum
     * WCAG 2.2. Leur zone de toucher passe a 44 px, sans deplacer le texte.
     */
    it('donne aux liens une zone de toucher de 44 px sous 1024 px', () => {
        render(<Login toggle={mockToggle} onForgotPassword={mockForgotPassword} />)
        for (const nom of ['Mot de passe oublié ?', "S'inscrire"]) {
            const c = screen.getByRole('button', { name: nom }).className
            expect(c).toContain('max-lg:h-11')
            expect(c).toContain('max-lg:-my-3')
        }
    })
})

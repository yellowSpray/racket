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
})

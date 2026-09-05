import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { mockResetPasswordForEmail, mockHandleError, mockClearError } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
  mockHandleError: vi.fn(),
  mockClearError: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  },
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

import ForgotPassword from '../ForgotPassword'

describe('ForgotPassword', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
  })

  it('affiche le titre et la description', () => {
    render(<ForgotPassword onBack={mockOnBack} />)
    expect(screen.getByText('Mot de passe oublié')).toBeInTheDocument()
    expect(
      screen.getByText(/Entrez votre adresse email/)
    ).toBeInTheDocument()
  })

  it('affiche un champ email et un bouton envoyer', () => {
    render(<ForgotPassword onBack={mockOnBack} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /envoyer le lien/i })).toBeInTheDocument()
  })

  it('appelle resetPasswordForEmail avec le bon email', async () => {
    render(<ForgotPassword onBack={mockOnBack} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }))

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/auth/reset-password') })
      )
    })
  })

  it('affiche un message de succès après envoi', async () => {
    render(<ForgotPassword onBack={mockOnBack} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }))

    await waitFor(() => {
      expect(screen.getByText(/email.*envoyé/i)).toBeInTheDocument()
    })
  })

  it('appelle handleError si Supabase échoue', async () => {
    const loginError = { message: 'User not found' }
    mockResetPasswordForEmail.mockResolvedValue({
      data: null,
      error: loginError,
    })
    render(<ForgotPassword onBack={mockOnBack} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }))

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(loginError)
    })
  })

  it('appelle onBack quand on clique Retour', () => {
    render(<ForgotPassword onBack={mockOnBack} />)

    fireEvent.click(screen.getByRole('button', { name: /retour/i }))
    expect(mockOnBack).toHaveBeenCalled()
  })
})

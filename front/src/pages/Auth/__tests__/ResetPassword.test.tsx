import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { mockUpdateUser, mockNavigate, mockHandleError, mockClearError } = vi.hoisted(() => ({
  mockUpdateUser: vi.fn(),
  mockNavigate: vi.fn(),
  mockHandleError: vi.fn(),
  mockClearError: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      updateUser: mockUpdateUser,
    },
  },
}))

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
    clearError: mockClearError,
    getFieldError: () => null,
    error: null,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import ResetPassword from '../ResetPassword'

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })
  })

  it('affiche le titre', () => {
    render(<ResetPassword />)
    expect(screen.getByRole('heading', { name: 'Nouveau mot de passe' })).toBeInTheDocument()
  })

  it('affiche les champs mot de passe et confirmation', () => {
    render(<ResetPassword />)
    expect(screen.getByLabelText('Nouveau mot de passe')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument()
  })

  it('appelle updateUser avec le bon mot de passe', async () => {
    render(<ResetPassword />)

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'newpass123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
      target: { value: 'newpass123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' })
    })
  })

  it('redirige vers /auth après succès', async () => {
    render(<ResetPassword />)

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'newpass123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
      target: { value: 'newpass123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true })
    })
  })

  it('appelle handleError avec ValidationError si mots de passe différents', async () => {
    render(<ResetPassword />)

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'newpass123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
      target: { value: 'different' },
    })
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }))

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalled()
    })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('appelle handleError si Supabase échoue', async () => {
    const supabaseError = { message: 'Token expired' }
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: supabaseError,
    })
    render(<ResetPassword />)

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'newpass123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
      target: { value: 'newpass123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }))

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(supabaseError)
    })
  })
})

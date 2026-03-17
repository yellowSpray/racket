import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockUpdateUser = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

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

import ResetPassword from './ResetPassword'

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

  it('affiche une erreur de validation si mots de passe différents', async () => {
    render(<ResetPassword />)

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
      target: { value: 'newpass123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
      target: { value: 'different' },
    })
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }))

    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('affiche une erreur si Supabase échoue', async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: 'Token expired' },
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
      expect(screen.getByText('Token expired')).toBeInTheDocument()
    })
  })
})

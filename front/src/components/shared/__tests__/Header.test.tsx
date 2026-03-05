import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Header from '../Header'

// Mock dependencies
const mockNavigate = vi.fn()
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/admin' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

const mockSignOut = vi.fn().mockResolvedValue({})
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: () => mockSignOut(),
    },
  },
}))

vi.mock('@/components/ui/logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}))

const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('Header', () => {
  it('renders the logo and site name', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByText('Logo name')).toBeInTheDocument()
  })

  it('renders login buttons when not authenticated', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
    expect(screen.getByText('Commencer')).toBeInTheDocument()
  })

  it('does not show logout button when not authenticated', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.queryByText('Déconnexion')).not.toBeInTheDocument()
  })

  it('renders logout button when authenticated', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'admin' },
      isAuthenticated: true,
    })
    render(<Header />)
    expect(screen.getByText('Déconnexion')).toBeInTheDocument()
  })

  it('does not show login buttons when authenticated', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'admin' },
      isAuthenticated: true,
    })
    render(<Header />)
    expect(screen.queryByText('Se connecter')).not.toBeInTheDocument()
    expect(screen.queryByText('Commencer')).not.toBeInTheDocument()
  })

  it('calls signOut and navigates on logout click', async () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'admin' },
      isAuthenticated: true,
    })
    render(<Header />)
    fireEvent.click(screen.getByText('Déconnexion'))
    // signOut is called
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('links logo to home page', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    const homeLink = screen.getByText('Logo name').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('links login buttons to /auth', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    const loginLink = screen.getByText('Se connecter').closest('a')
    expect(loginLink).toHaveAttribute('href', '/auth')
    const startLink = screen.getByText('Commencer').closest('a')
    expect(startLink).toHaveAttribute('href', '/auth')
  })
})

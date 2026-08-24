import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Header from '../Header'

// Mock dependencies
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/admin' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

vi.mock('@/components/ui/logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}))

const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('Header — alignement du bloc logo sur la sidebar', () => {
  // La sidebar occupe 1 colonne d'une grille de 24 (DashboardLayout).
  // Le bloc logo doit occuper la meme colonne pour rester aligne quelle que soit la largeur.
  it('reprend la grille 24 colonnes du layout', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    const { container } = render(<Header />)
    expect(container.querySelector('header')).toHaveClass('grid', 'grid-cols-24', 'gap-4')
  })

  it('donne une seule colonne au placeholder du logo', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.getByTestId('logo-placeholder')).toHaveClass('col-span-1')
  })

  it('laisse les 23 colonnes restantes au contenu du header', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.getByTestId('header-content')).toHaveClass('col-span-23')
  })

  it('ne fixe plus de largeur en dur sur le placeholder', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.getByTestId('logo-placeholder')).not.toHaveClass('w-16')
  })
})

describe('Header', () => {
  it('renders the logo and site name', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByText('volena')).toBeInTheDocument()
  })

  it('renders login button when not authenticated', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.getByText('Commencer')).toBeInTheDocument()
  })

  it('does not show profile link when not authenticated', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument()
  })

  it('renders profile link when authenticated', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'admin', first_name: 'Jean', last_name: 'Dupont' },
      isAuthenticated: true,
    })
    render(<Header />)
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
  })

  it('does not show login button when authenticated', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'admin', first_name: 'Jean', last_name: 'Dupont' },
      isAuthenticated: true,
    })
    render(<Header />)
    expect(screen.queryByText('Commencer')).not.toBeInTheDocument()
  })

  it('links logo to home page', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    const homeLink = screen.getByText('volena').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('links login button to /auth', () => {
    mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
    render(<Header />)
    const startLink = screen.getByText('Commencer').closest('a')
    expect(startLink).toHaveAttribute('href', '/auth')
  })

  it('links profile to correct route for admin', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '1', role: 'admin', first_name: 'Jean', last_name: 'Dupont' },
      isAuthenticated: true,
    })
    render(<Header />)
    const profileLink = screen.getByText('Jean Dupont').closest('a')
    expect(profileLink).toHaveAttribute('href', '/admin/profile')
  })

  it('links profile to correct route for user', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '2', role: 'user', first_name: 'Marie', last_name: 'Martin' },
      isAuthenticated: true,
    })
    render(<Header />)
    const profileLink = screen.getByText('Marie Martin').closest('a')
    expect(profileLink).toHaveAttribute('href', '/user/profile')
  })
})

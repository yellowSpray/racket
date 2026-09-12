import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Header from '../Header'

const mockPathname = { value: '/admin' }
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: mockPathname.value }),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>{children}</a>
  ),
}))

// Le fil d'Ariane a ses propres tests et ses propres dependances de contexte.
vi.mock('../AppBreadcrumb', () => ({
  AppBreadcrumb: () => <nav data-testid="fil-ariane" />,
}))

const mockUseEvent = vi.fn()
vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => mockUseEvent(),
}))

const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Pas de valeur par defaut ici : `evenement(undefined)` doit vouloir dire
// « pas de jeton », pas « reprends le jeton par defaut ».
function evenement(invite_token?: string) {
  mockUseEvent.mockReturnValue({
    currentEvent: { id: 'e1', event_name: 'Mixed', invite_token },
  })
}

function connecte(role: 'admin' | 'user' = 'admin') {
  mockUseAuth.mockReturnValue({
    profile: { id: '1', role, first_name: 'Jean', last_name: 'Dupont' },
    isAuthenticated: true,
  })
  evenement('jeton-abc')
}

function anonyme() {
  mockUseAuth.mockReturnValue({ profile: null, isAuthenticated: false })
  mockUseEvent.mockReturnValue({ currentEvent: null })
}

/*
 * Le header etait une grille de 24 colonnes calquee sur `DashboardLayout`, avec
 * un carre gris occupant la colonne de la barre laterale pour rester aligne.
 * Il est desormais une barre pleine largeur posee au-dessus de la coque : il
 * n'a plus rien a aligner, et la barre laterale n'est plus une fraction
 * d'ecran. Ces tests verrouillent ce renversement.
 */
describe('Header, barre pleine largeur', () => {
  it('n\'est plus une grille de 24 colonnes', () => {
    anonyme()
    const { container } = render(<Header />)
    const header = container.querySelector('header')!
    expect(header).not.toHaveClass('grid-cols-24')
    expect(header.className).toContain('flex')
  })

  /*
   * Le bloc de marque tient la colonne de la barre laterale : deux
   * emplacements, le pictogramme et le nom, qui font ensemble la largeur d'une
   * entree de menu. `DashboardLayout` pose la meme largeur sur son `aside`, les
   * deux doivent rester d'accord.
   */
  it('cale le bloc de marque sur la colonne de la barre laterale', () => {
    anonyme()
    render(<Header />)
    const marque = screen.getByRole('link', { name: 'Racket Fest' })
    expect(marque).toHaveAttribute('href', '/')
    expect(marque.className).toContain('w-[207px]')
  })

  /*
   * Le pictogramme demarre sur la meme verticale que les pastilles du menu,
   * 32 px. Le bloc garde ses 207 px, donc seul son retrait interieur bouge :
   * `pl-8` a gauche comme l'`aside`, `pr-2.5` a droite comme lui aussi.
   */
  it('demarre le pictogramme sur la verticale des entrees de menu', () => {
    anonyme()
    render(<Header />)
    const marque = screen.getByRole('link', { name: 'Racket Fest' })
    expect(marque.className).toContain('pl-8')
    expect(marque.className).toContain('pr-2.5')
  })

  /*
   * Le bloc de droite s'arrete sur la verticale du bord droit des cartes, soit
   * les 32 px de `px-8`. Il tenait a 12 px, et l'avatar depassait donc de la
   * colonne de contenu qu'il surplombe.
   */
  it('arrete le bloc de droite sur la verticale des cartes', () => {
    anonyme()
    const { container } = render(<Header />)
    expect(container.querySelector('header')!.className).toContain('pr-8')
  })

  it('reserve un emplacement pour le pictogramme et un pour le nom', () => {
    anonyme()
    render(<Header />)
    expect(screen.getByTestId('logo-icon-placeholder')).toBeInTheDocument()
    expect(screen.getByTestId('logo-name-placeholder')).toBeInTheDocument()
  })

  // Le fil doit demarrer sur la meme verticale que le titre de la page.
  it('aligne le fil d\'Ariane sur le titre du contenu', () => {
    connecte()
    render(<Header />)
    expect(screen.getByTestId('fil-ariane').parentElement!.className).toContain('pl-8')
  })

  it('affiche le fil d\'Ariane dans l\'application', () => {
    connecte()
    render(<Header />)
    expect(screen.getByTestId('fil-ariane')).toBeInTheDocument()
  })

  // Hors application (accueil, page publique) il n'y a ni club ni serie a situer.
  it('masque le fil d\'Ariane hors de l\'application', () => {
    mockPathname.value = '/'
    anonyme()
    render(<Header />)
    expect(screen.queryByTestId('fil-ariane')).not.toBeInTheDocument()
    mockPathname.value = '/admin'
  })

  it('offre la recherche et le theme a un utilisateur connecte', () => {
    connecte()
    render(<Header />)
    expect(screen.getByRole('searchbox', { name: /rechercher/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /th[eè]me/i })).toBeInTheDocument()
  })

  // Les pages deposent leurs boutons ici, juste avant le bloc global.
  it('garde un emplacement pour les actions de page', () => {
    connecte()
    render(<Header />)
    expect(screen.getByTestId('header-actions')).toBeInTheDocument()
  })

  /*
   * Les pastilles du header portent un filet de 1 px, pas les 2 px du bouton
   * par defaut : a 28 px de cote, un trait double ecrase le pictogramme.
   */
  it('affine le filet de ses pastilles', () => {
    connecte()
    render(<Header />)
    for (const nom of [/th[eè]me/i, /notifications/i]) {
      const bouton = screen.getByRole('button', { name: nom })
      expect(bouton.className).toContain('border')
      expect(bouton.className).not.toContain('border-2')
    }
  })

  it('arrondit completement le champ de recherche', () => {
    connecte()
    render(<Header />)
    expect(screen.getByRole('searchbox', { name: /rechercher/i }).className)
      .toContain('rounded-full')
  })

  // Le lien d'invitation appartient a l'evenement affiche, pas au club.
  it('offre le lien d\'invitation de l\'evenement courant', () => {
    connecte()
    render(<Header />)
    expect(screen.getByRole('button', { name: /Mixed/ })).toBeInTheDocument()
  })

  it('n\'offre rien quand l\'evenement n\'a pas de jeton', () => {
    connecte()
    evenement(undefined)
    render(<Header />)
    expect(screen.queryByRole('button', { name: /Mixed/ })).not.toBeInTheDocument()
  })

  it('laisse respirer au-dessus et au-dessous', () => {
    connecte()
    const { container } = render(<Header />)
    expect(container.querySelector('header')!.className).toContain('h-12')
  })

  /*
   * Le champ faisait 28 px et les pastilles 32 : une ligne de controles dont
   * les bords haut et bas ne tombaient pas ensemble. Tout est a 32.
   */
  it('aligne la hauteur de tous ses controles', () => {
    connecte()
    render(<Header />)
    expect(screen.getByRole('searchbox', { name: /rechercher/i }).className).toContain('h-8')
    for (const nom of [/th[eè]me/i, /notifications/i, /Mixed/]) {
      expect(screen.getByRole('button', { name: nom }).className).toContain('size-8')
    }
  })

  // La barre est deja `bg-card` : sans fond plus clair, le champ s'y fondait.
  it('detache le champ de recherche du fond de la barre', () => {
    connecte()
    render(<Header />)
    expect(screen.getByRole('searchbox', { name: /rechercher/i }).className).toContain('bg-accent')
  })

  it('pose le raccourci sans pastille de fond', () => {
    connecte()
    render(<Header />)
    expect(screen.getByText('Ctrl F').className).not.toContain('bg-muted')
  })

  it('n\'utilise pas de tiret cadratin', () => {
    connecte()
    const { container } = render(<Header />)
    expect(container.textContent).not.toContain('—')
  })
})

describe('Header', () => {
  it('renders login button when not authenticated', () => {
    anonyme()
    render(<Header />)
    expect(screen.getByText('Commencer')).toBeInTheDocument()
  })

  it('does not show profile link when not authenticated', () => {
    anonyme()
    render(<Header />)
    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument()
  })

  it('renders profile link when authenticated', () => {
    connecte()
    render(<Header />)
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
  })

  it('does not show login button when authenticated', () => {
    connecte()
    render(<Header />)
    expect(screen.queryByText('Commencer')).not.toBeInTheDocument()
  })

  it('links login button to /auth', () => {
    anonyme()
    render(<Header />)
    expect(screen.getByText('Commencer').closest('a')).toHaveAttribute('href', '/auth')
  })

  it('links profile to correct route for admin', () => {
    connecte('admin')
    render(<Header />)
    expect(screen.getByText('Jean Dupont').closest('a')).toHaveAttribute('href', '/admin/profile')
  })

  it('links profile to correct route for user', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: '2', role: 'user', first_name: 'Marie', last_name: 'Martin' },
      isAuthenticated: true,
    })
    render(<Header />)
    expect(screen.getByText('Marie Martin').closest('a')).toHaveAttribute('href', '/user/profile')
  })
})

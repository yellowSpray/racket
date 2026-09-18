import { render, screen, within, fireEvent } from '@testing-library/react'
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

/*
 * Il y a deux champs de recherche dans le document et un seul a l'ecran : le
 * deploye porte `lg:block`, le replie `lg:hidden`. jsdom n'applique aucune
 * feuille de style, donc les deux repondent a `getByRole` et il faut dire
 * lequel on interroge. Dans un navigateur, l'autre est en `display: none` et
 * ne figure ni a l'ecran ni dans l'arbre d'accessibilite.
 */
function champDeploye(): HTMLElement {
  return within(document.querySelector('[data-recherche]') as HTMLElement)
    .getByRole('searchbox', { name: /rechercher/i })
}

function rechercheRepliee() {
  const boite = document.querySelector('[data-recherche-repliee]') as HTMLElement
  return {
    boite,
    bouton: within(boite).getByRole('button', { name: /rechercher/i }),
    champ: within(boite).getByRole('searchbox', { name: /rechercher/i }),
  }
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
    // Les deux etats, sinon `toContain` se contenterait du prefixe `lg:`.
    expect(marque.className).toContain('lg:w-[207px]')
    expect(marque.className).toContain('w-[54px]')
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
    expect(marque.className).toContain('lg:pl-8')
    expect(marque.className).toContain('lg:pr-2.5')
    // Repliee, la colonne de 54 px centre son pictogramme : retrait symetrique.
    expect(marque.className).toContain('px-2.5')
  })

  /*
   * Le bloc de droite s'arrete sur la verticale du bord droit des cartes, soit
   * les 32 px de `px-8`. Il tenait a 12 px, et l'avatar depassait donc de la
   * colonne de contenu qu'il surplombe.
   */
  it('arrete le bloc de droite sur la verticale des cartes', () => {
    anonyme()
    const { container } = render(<Header />)
    // La gouttiere ne depend pas de la taille de l'ecran : 32 px partout.
    expect(container.querySelector('header')!.className).toContain('pr-8')
  })

  it('reserve un emplacement pour le pictogramme et un pour le nom', () => {
    anonyme()
    render(<Header />)
    expect(screen.getByTestId('logo-icon-placeholder')).toBeInTheDocument()
    expect(screen.getByTestId('logo-name-placeholder')).toBeInTheDocument()
  })

  /*
   * Deux fils d'Ariane dans le document, un seul a l'ecran : celui de la barre
   * du haut est en `hidden sm:flex`, celui de la seconde barre en `sm:hidden`.
   * jsdom n'applique pas de style, donc les deux repondent aux requetes.
   */
  function filsDAriane() {
    return screen.getAllByTestId('fil-ariane')
  }

  // Le fil doit demarrer sur la meme verticale que le titre de la page.
  it('aligne le fil d\'Ariane sur le titre du contenu', () => {
    connecte()
    render(<Header />)
    expect(filsDAriane()[0].parentElement!.className).toContain('pl-8')
  })

  it('affiche le fil d\'Ariane dans l\'application', () => {
    connecte()
    render(<Header />)
    expect(filsDAriane().length).toBeGreaterThan(0)
  })

  /*
   * SOUS 640 PX LE FIL DESCEND DANS SA PROPRE BARRE. Il lui faut 336 px pour
   * ses trois segments, et il n'en a que 129 dans la barre du haut une fois la
   * marque et les quatre pastilles servies : il s'y reduisait a trois
   * pictogrammes, donc a rien, alors que ses deux selecteurs sont le seul moyen
   * de changer d'evenement et de serie.
   */
  it('descend le fil d\'Ariane dans une seconde barre sur telephone', () => {
    connecte()
    const { container } = render(<Header />)

    const seconde = container.querySelector('[data-second-header]')!
    expect(seconde.className).toContain('sm:hidden')
    expect(seconde.className).toContain('border-b')
    expect(within(seconde as HTMLElement).getByTestId('fil-ariane')).toBeInTheDocument()

    // Et il quitte la barre du haut a cette largeur.
    const haut = filsDAriane()[0].parentElement!
    expect(haut.className).toContain('hidden')
    expect(haut.className).toContain('sm:flex')
  })

  // Hors application il n'y a ni club ni serie a situer : pas de seconde barre.
  it('se passe de seconde barre hors de l\'application', () => {
    mockPathname.value = '/'
    anonyme()
    const { container } = render(<Header />)
    expect(container.querySelector('[data-second-header]')).toBeNull()
    mockPathname.value = '/admin'
  })

  // Hors application (accueil, page publique) il n'y a ni club ni serie a situer.
  it('masque le fil d\'Ariane hors de l\'application', () => {
    mockPathname.value = '/'
    anonyme()
    render(<Header />)
    expect(screen.queryAllByTestId('fil-ariane')).toHaveLength(0)
    mockPathname.value = '/admin'
  })

  it('offre la recherche a un utilisateur connecte', () => {
    connecte()
    render(<Header />)
    expect(champDeploye()).toBeInTheDocument()
  })

  /*
   * Sous 1024 la colonne de gauche se replie sur son pictogramme, et le bloc de
   * marque doit se replier avec elle : il occupe exactement sa largeur, donc un
   * nom reste a 207 px pendant que la barre passe a 54 ferait flotter le logo
   * au-dessus du contenu.
   */
  it('replie le bloc de marque sur son pictogramme', () => {
    anonyme()
    render(<Header />)
    expect(screen.getByTestId('logo-icon-placeholder').className).not.toContain('hidden')
    const nom = screen.getByTestId('logo-name-placeholder')
    expect(nom.className).toContain('hidden')
    expect(nom.className).toContain('lg:block')
  })

  /*
   * La recherche est le plus gros objet du header, 336 px : davantage que le
   * fil d'Ariane, les notifications et l'avatar reunis. Elle se retracte en
   * quatre temps au lieu de manger le fil des que l'ecran serre.
   */
  it('retracte la recherche en quatre temps', () => {
    connecte()
    render(<Header />)
    const champ = champDeploye()
    expect(champ.className).toContain('w-48')
    expect(champ.className).toContain('xl:w-64')
    expect(champ.className).toContain('2xl:w-84')
    // Le bloc entier disparait sous 1024, ou le champ replie prend le relais.
    expect(document.querySelector('[data-recherche]')!.className).toContain('lg:block')
  })

  /*
   * Le rappel du raccourci part avant la largeur : il occupe 44 px de retrait
   * interieur, donc le garder sur un champ de 192 le viderait de sa place utile.
   */
  it('ne garde le rappel du raccourci que sur les grands ecrans', () => {
    connecte()
    const { container } = render(<Header />)
    const kbd = container.querySelector('[data-recherche] kbd')!
    expect(kbd.className).toContain('hidden')
    expect(kbd.className).toContain('2xl:block')
  })

  /*
   * L'INVITE S'ALLONGE PAR MORCEAUX au lieu d'etre coupee net. Un `placeholder`
   * est un attribut, pas du style : il ne peut pas changer avec la largeur. Le
   * champ garde donc un espace comme invite reelle, ce qui laisse
   * `:placeholder-shown` vrai tant qu'il est vide, et le texte visible est pose
   * par-dessus.
   *
   *   Rechercher                toujours
   *     un joueur               a partir de 1280
   *   , un match...             a partir de 1536
   */
  it('allonge l\'invite au lieu de la couper', () => {
    connecte()
    const { container } = render(<Header />)
    expect(champDeploye()).toHaveAttribute('placeholder', ' ')

    const invite = container.querySelector('[data-invite-recherche]')!
    expect(invite.textContent).toBe('Rechercher un joueur, un match...')
    expect(invite.className).toContain('peer-[:not(:placeholder-shown)]:hidden')

    const morceaux = [...invite.querySelectorAll('span')]
    expect(morceaux.map(m => m.textContent)).toEqual([' un joueur', ', un match...'])
    expect(morceaux[0].className).toContain('xl:inline')
    expect(morceaux[1].className).toContain('2xl:inline')
  })

  describe('la recherche repliee', () => {
    /*
     * Ce n'est pas un second controle, c'est le meme champ plie a 32 px : un
     * seul `input` dans le document de ce cote-la. Un bouton qui ouvrirait un
     * dialogue portant un autre champ en ferait deux a tenir d'accord.
     */
    it('est le champ lui-meme, retracte a la taille d\'une pastille', () => {
      connecte()
      render(<Header />)
      const { boite, champ } = rechercheRepliee()
      expect(boite.className).toContain('w-8')
      expect(boite.parentElement!.className).toContain('lg:hidden')
      expect(champ).toBeInTheDocument()
    })

    it('s\'ouvre au clic et prend le foyer', () => {
      connecte()
      render(<Header />)
      const { bouton } = rechercheRepliee()
      expect(bouton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(bouton)

      const { boite, champ } = rechercheRepliee()
      expect(boite).toHaveAttribute('data-ouverte')
      expect(boite.className).toContain('w-[calc(100vw-198px)]')
      expect(champ).toHaveFocus()
    })

    /*
     * Echap rend la main au lieu de se contenter de refermer : le premier jet
     * laissait le foyer dans un champ devenu invisible, ou l'on pouvait donc
     * continuer a taper dans le vide.
     */
    it('se replie sur Echap et rend le foyer', () => {
      connecte()
      render(<Header />)
      fireEvent.click(rechercheRepliee().bouton)
      fireEvent.keyDown(rechercheRepliee().champ, { key: 'Escape' })

      const { boite, champ } = rechercheRepliee()
      expect(boite).not.toHaveAttribute('data-ouverte')
      expect(champ).not.toHaveFocus()
    })

    // Cliquer ailleurs la referme aussi : c'est le foyer qui la tient ouverte.
    it('se replie quand elle perd le foyer', () => {
      connecte()
      render(<Header />)
      fireEvent.click(rechercheRepliee().bouton)
      fireEvent.blur(rechercheRepliee().champ)
      expect(rechercheRepliee().boite).not.toHaveAttribute('data-ouverte')
    })
  })

  /*
   * Le bouton de theme est retire le temps du chantier des tokens. Il basculait
   * une classe `dark` a laquelle `index.css` ne repondait pas, et que Tailwind
   * n'ecoutait meme pas faute de `@custom-variant`. Ce test dit que son absence
   * est une decision, et il tombera le jour ou le bouton revient.
   */
  it('ne propose pas de theme tant que le sombre n\'existe pas', () => {
    connecte()
    render(<Header />)
    expect(screen.queryByRole('button', { name: /th[eè]me/i })).not.toBeInTheDocument()
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
    for (const nom of [/notifications/i, /Mixed/]) {
      const bouton = screen.getByRole('button', { name: nom })
      expect(bouton.className).toContain('border')
      expect(bouton.className).not.toContain('border-2')
    }
  })

  /*
   * La pastille de la cloche est une alerte, donc le rouge plein du systeme,
   * celui de la tuile des paiements. Elle etait en `bg-rose-500`, seul emploi
   * du rose dans toute l'application : proche du rouge d'alerte sans etre le
   * meme, donc le jour ou celui-ci change, elle ne suit pas.
   */
  it('dit son alerte avec le rouge du systeme', () => {
    connecte()
    render(<Header />)
    const bouton = screen.getByRole('button', { name: /notifications/i })
    const pastille = bouton.querySelector('span')
    expect(pastille).not.toBeNull()
    expect(pastille!.className).toContain('bg-destructive')
    expect(pastille!.className).not.toMatch(/bg-(rose|red|pink|orange)-\d/)
  })

  it('arrondit completement le champ de recherche', () => {
    connecte()
    render(<Header />)
    expect(champDeploye().className).toContain('rounded-full')
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
    expect(champDeploye().className).toContain('h-8')
    for (const nom of [/notifications/i, /Mixed/]) {
      expect(screen.getByRole('button', { name: nom }).className).toContain('size-8')
    }
  })

  // La barre est deja `bg-card` : sans fond plus clair, le champ s'y fondait.
  it('detache le champ de recherche du fond de la barre', () => {
    connecte()
    render(<Header />)
    expect(champDeploye().className).toContain('bg-accent')
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

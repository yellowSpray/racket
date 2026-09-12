import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminSideBar } from '../AdminSidebar'

const mockLocation = { pathname: '/admin' }
vi.mock('react-router', () => ({
    useLocation: () => mockLocation,
    Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
        <a href={to} {...rest}>{children}</a>
    ),
}))

const mockSignOut = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ signOut: mockSignOut }),
}))

describe('AdminSideBar', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockLocation.pathname = '/admin'
    })

    /*
     * Le rail d'icones sans libelle obligeait a deviner chaque entree. La barre
     * porte desormais le mot a cote de l'icone : c'est ce que la maquette du
     * 11 septembre montre, et c'est ce qui rend la navigation lisible.
     */
    it('nomme chacune de ses entrees', () => {
        render(<AdminSideBar />)
        for (const nom of ['Dashboard', 'Tableaux', 'Matchs', 'Joueurs', 'Email', 'Réglages']) {
            expect(screen.getByRole('link', { name: nom })).toBeInTheDocument()
        }
    })

    it('marque la page courante', () => {
        render(<AdminSideBar />)
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'Tableaux' })).not.toHaveAttribute('aria-current')
    })

    /*
     * L'etat courant se dit par un fond neutre et un texte plus noir, pas par
     * la couleur de marque. Le vert est la couleur des actions ; s'en servir
     * pour « vous etes ici » le rendait cliquable a l'oeil, et privait la barre
     * d'un accent disponible pour signaler autre chose.
     */
    it('marque l\'entree courante par un fond neutre, pas par la couleur de marque', () => {
        render(<AdminSideBar />)
        const actif = screen.getByRole('link', { name: 'Dashboard' })
        expect(actif.className).toMatch(/(^|\s)bg-muted(\s|$)/)
        expect(actif.className).not.toContain('bg-primary')
        expect(actif.className).toContain('font-semibold')
    })

    // Le survol doit rester plus leger que l'etat courant, sinon il ment.
    it('survole plus legerement qu\'il ne marque', () => {
        render(<AdminSideBar />)
        expect(screen.getByRole('link', { name: 'Tableaux' }).className).toContain('hover:bg-muted/60')
    })

    // `/admin` ne doit pas s'allumer quand on est sur `/admin/draws`.
    it('ne confond pas le tableau de bord avec ses sous-pages', () => {
        mockLocation.pathname = '/admin/draws'
        render(<AdminSideBar />)
        expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
        expect(screen.getByRole('link', { name: 'Tableaux' })).toHaveAttribute('aria-current', 'page')
    })

    it('allume les reglages depuis une de leurs sous-pages', () => {
        mockLocation.pathname = '/admin/settings/rounds/1'
        render(<AdminSideBar />)
        expect(screen.getByRole('link', { name: 'Réglages' })).toHaveAttribute('aria-current', 'page')
    })

    // Trois groupes : navigation, gestion, configuration. Deux filets.
    it('separe ses entrees en trois groupes', () => {
        const { container } = render(<AdminSideBar />)
        expect(container.querySelectorAll('[data-sidebar-separator]')).toHaveLength(2)
    })

    /*
     * Les filets traversent la barre de bord a bord : ils annulent ses deux
     * retraits, 32 px a gauche et 10 a droite. Sans quoi ils flottent au milieu
     * de la colonne, alors qu'ils separent la colonne entiere et rejoignent le
     * trait qui la borde.
     */
    it('fait traverser les filets de bord a bord', () => {
        const { container } = render(<AdminSideBar />)
        for (const filet of container.querySelectorAll('[data-sidebar-separator]')) {
            expect(filet.className).toContain('-ml-8')
            expect(filet.className).toContain('-mr-2.5')
        }
    })

    // Le filet du pied suit la meme regle, il n'est simplement pas un separateur
    // entre deux groupes.
    it('fait traverser le filet du pied de barre', () => {
        const { container } = render(<AdminSideBar />)
        const filet = container.querySelector('[data-sidebar-footer] .h-px')!
        expect(filet.className).toContain('-ml-8')
        expect(filet.className).toContain('-mr-2.5')
    })

    it('pose la deconnexion en pied de barre', () => {
        render(<AdminSideBar />)
        const quitter = screen.getByRole('button', { name: 'Quitter' })
        expect(quitter).toBeInTheDocument()
        expect(quitter.closest('[data-sidebar-footer]')).not.toBeNull()
    })

    it('deconnecte au clic', () => {
        render(<AdminSideBar />)
        screen.getByRole('button', { name: 'Quitter' }).click()
        expect(mockSignOut).toHaveBeenCalled()
    })

    it('n\'utilise pas de tiret cadratin', () => {
        const { container } = render(<AdminSideBar />)
        expect(container.textContent).not.toContain('—')
    })
})

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminSideBar, AdminTabs } from '../AdminSidebar'

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
            expect(filet.className).toContain('lg:-ml-8')
            expect(filet.className).toContain('lg:-mr-2.5')
            // Repliee, la barre a un retrait symetrique : le filet l'annule aussi.
            expect(filet.className).toContain('-mx-2.5')
        }
    })

    // Le filet du pied suit la meme regle, il n'est simplement pas un separateur
    // entre deux groupes.
    it('fait traverser le filet du pied de barre', () => {
        const { container } = render(<AdminSideBar />)
        const filet = container.querySelector('[data-sidebar-footer] .h-px')!
        expect(filet.className).toContain('lg:-ml-8')
        expect(filet.className).toContain('lg:-mr-2.5')
        expect(filet.className).toContain('-mx-2.5')
    })

    /*
     * REPLIEE, LA BARRE CACHE SES LIBELLES SANS LES SUPPRIMER. `sr-only` et non
     * `hidden` : un lecteur d'ecran n'aurait sinon que six pictogrammes muets.
     * Le `title` donne la meme chose a la souris, et le nom accessible du lien
     * reste inchange dans les deux etats, ce que verifie `getByRole` ci-dessus.
     */
    it('garde le nom de ses entrees quand elle se replie', () => {
        render(<AdminSideBar />)
        for (const nom of ['Dashboard', 'Tableaux', 'Matchs', 'Joueurs', 'Email', 'Réglages']) {
            const lien = screen.getByRole('link', { name: nom })
            expect(lien).toHaveAttribute('title', nom)
            const libelle = lien.querySelector('span')!
            expect(libelle.className).toContain('sr-only')
            expect(libelle.className).toContain('lg:not-sr-only')
        }
    })

    // Le pictogramme se centre dans la pastille tant qu'il est seul dedans.
    it('centre ses pictogrammes tant qu\'ils sont seuls', () => {
        render(<AdminSideBar />)
        const lien = screen.getByRole('link', { name: 'Dashboard' })
        expect(lien.className).toContain('justify-center')
        expect(lien.className).toContain('lg:justify-start')
        // L'ecart entre l'icone et le mot n'a pas lieu d'etre sans le mot.
        expect(lien.className).toContain('gap-0')
        expect(lien.className).toContain('lg:gap-2.5')
    })

    it('replie la deconnexion comme les autres entrees', () => {
        render(<AdminSideBar />)
        const quitter = screen.getByRole('button', { name: 'Quitter' })
        expect(quitter).toHaveAttribute('title', 'Quitter')
        expect(quitter.querySelector('span')!.className).toContain('sr-only')
        expect(quitter.className).toContain('justify-center')
        expect(quitter.className).toContain('lg:justify-start')
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

    /*
     * LES ONGLETS DU TELEPHONE NE PRENNENT QUE CINQ DES SIX ENTREES. Au-dela,
     * chaque onglet passe sous les 44 px d'une cible tactile sur un ecran de
     * 320. `Reglages` et `Quitter` descendent dans la page profil, que l'avatar
     * du header ouvre deja : ce sont les deux gestes qu'on fait rarement, et ils
     * n'ont rien a voir avec la consultation quotidienne.
     *
     * A FAIRE : cette maison n'existe pas encore. Tant qu'elle n'est pas la, un
     * admin sur telephone ne peut ni ouvrir ses reglages ni se deconnecter.
     */
    it('ne descend que cinq entrees dans les onglets', () => {
        render(<AdminTabs />)
        for (const nom of ['Dashboard', 'Tableaux', 'Matchs', 'Joueurs', 'Email']) {
            expect(screen.getByRole('link', { name: nom })).toBeInTheDocument()
        }
        expect(screen.queryByRole('link', { name: 'Réglages' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Quitter' })).not.toBeInTheDocument()
    })
})

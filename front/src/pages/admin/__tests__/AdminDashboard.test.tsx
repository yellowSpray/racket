import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminDashboard } from '../AdminDashboard'

vi.mock('react-router', () => ({
    Navigate: ({ to }: { to: string }) => <div data-testid="redirection">{to}</div>,
}))

const mockUseEvent = vi.fn()
vi.mock('@/contexts/EventContext', () => ({ useEvent: () => mockUseEvent() }))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ profile: { id: 'p1', club_id: 'c1', role: 'admin' } }),
}))

/*
 * Le club porte un nom, et ce nom ne doit apparaitre nulle part dans la page.
 * La simulation reste donc en place apres le retrait du hook : sans elle, le
 * vrai `useClubConfig` partirait sur le reseau et rendrait `null`, et le test
 * passerait sans rien prouver.
 */
vi.mock('@/hooks/useClubConfig', () => ({
    useClubConfig: () => ({ clubConfig: { club_name: 'Castle Club' }, fetchClubConfig: vi.fn() }),
}))

vi.mock('@/contexts/HeaderSlotContext', () => ({
    useHeaderSlot: (c: React.ReactNode) => c,
}))

/*
 * Les quatre cartes sont remplacees par des marqueurs : ce fichier ne juge que
 * la disposition de la page, chaque carte ayant deja ses propres tests.
 */
vi.mock('@/components/admin/dashboard/MatchesCard', () => ({
    MatchesCard: ({ className }: { className?: string }) => <div data-tuile="matchs" className={className} />,
}))
vi.mock('@/components/admin/dashboard/PlayersStatusCard', () => ({
    PlayersStatusCard: ({ className }: { className?: string }) => <div data-tuile="inscrits" className={className} />,
}))
vi.mock('@/components/admin/dashboard/UnpaidPaymentsCard', () => ({
    UnpaidPaymentsCard: ({ className }: { className?: string }) => <div data-tuile="paiements" className={className} />,
}))
vi.mock('@/components/admin/dashboard/AlertsCard', () => ({
    AlertsCard: ({ className }: { className?: string }) => <div data-tuile="alertes" className={className} />,
}))

function setup() {
    mockUseEvent.mockReturnValue({
        currentEvent: { id: 'e1', event_rounds: [{ id: 'r4', round_number: 4 }] },
        currentRound: { id: 'r4', round_number: 4 },
        events: [{ id: 'e1' }],
        loading: false,
    })
    return render(<AdminDashboard />)
}

describe('AdminDashboard, disposition', () => {
    beforeEach(() => vi.clearAllMocks())

    /*
     * Une grille de 28 colonnes sur 16 rangees placait les cartes par
     * coordonnees. Deux colonnes suffisent a dire la meme chose, et le rail de
     * droite est une largeur, pas une fraction : ses cartes portent des noms et
     * des pastilles, elles ne gagnent rien a s'elargir, alors que le tableau
     * des matchs et ses cinq colonnes prend tout ce qui reste.
     */
    it('pose deux colonnes a partir de 1024, un rail de droite a largeur fixe', () => {
        const { container } = setup()
        const grille = container.querySelector('[data-carrousel]')!
        expect(grille.className).toContain('lg:grid-cols-[1fr_360px]')
        expect(container.querySelector('.grid-cols-28')).toBeNull()
    })

    /*
     * LES TROIS CARTES SONT TROIS SOEURS, dans cet ordre, et c'est ce qui rend
     * les deux dispositions possibles sans dupliquer le JSX. Le rail de droite
     * n'est plus un sous-conteneur : `grid-rows-2` plus un `row-span-2` sur les
     * matchs le reconstitue.
     */
    it('garde les trois cartes soeurs, les matchs d abord', () => {
        const { container } = setup()
        const piste = container.querySelector('[data-carrousel]')!
        expect([...piste.children].map(e => e.getAttribute('data-tuile')))
            .toEqual(['matchs', 'inscrits', 'paiements'])
        expect(piste.className).toContain('lg:grid-rows-2')
        expect(container.querySelector('[data-tuile="matchs"]')!.className)
            .toContain('lg:row-span-2')
    })

    /*
     * Les trois cartes portent un `ScrollArea` en `h-full` : sans chaine de
     * `min-h-0` jusqu'a elles, elles cessent de defiler et poussent la page.
     * En carrousel, c'est la piste qui la porte.
     */
    it('laisse chaque carte defiler dans sa boite', () => {
        const { container } = setup()
        expect(container.querySelector('[data-carrousel]')!.className).toContain('min-h-0')
        for (const tuile of ['matchs', 'inscrits', 'paiements']) {
            expect(container.querySelector(`[data-tuile="${tuile}"]`)!.className)
                .toContain('lg:min-h-0')
        }
    })

    /*
     * SOUS 1024, UNE CARTE PAR ECRAN QU'ON FAIT DEFILER DU POUCE.
     *
     * Les 360 px du rail ne se negocient pas : la grille reclamait 758 px de
     * large a toutes les tailles, donc la page debordait de 383 px sur un
     * telephone de 375. Les empiler reglait le debordement mais donnait une
     * page de trois ecrans de haut, ou l'on ne voit jamais deux cartes
     * ensemble.
     *
     * `scroll-snap` et non une bibliotheque : le navigateur pose les points
     * d'arret, le clavier et la molette marchent sans une ligne de code, et il
     * n'y a rien a desactiver au-dessus de 1024.
     */
    it('fait defiler les cartes une par une sur telephone', () => {
        const { container } = setup()
        const piste = container.querySelector('[data-carrousel]')!

        expect(piste.className).toContain('snap-x')
        expect(piste.className).toContain('snap-mandatory')
        expect(piste.className).toContain('overflow-x-auto')
        // Et rien de tout cela au-dela de 1024, ou la grille reprend.
        expect(piste.className).toContain('lg:snap-none')
        expect(piste.className).toContain('lg:overflow-visible')

        for (const tuile of ['matchs', 'inscrits', 'paiements']) {
            const carte = container.querySelector(`[data-tuile="${tuile}"]`)!
            expect(carte.className).toContain('w-full')
            expect(carte.className).toContain('shrink-0')
            expect(carte.className).toContain('snap-start')
        }
    })

    /*
     * Sans les pastilles, rien ne dit qu'il y a deux cartes de plus a droite :
     * une carte qui occupe tout l'ecran ne laisse voir aucun bord de sa
     * voisine. Elles menent au but autant qu'elles le disent, sinon il faut
     * trois balayages pour atteindre la troisieme.
     */
    it('annonce les trois cartes par des pastilles cliquables', () => {
        const { container } = setup()
        const points = container.querySelector('[data-carrousel-points]')!

        expect(points.className).toContain('lg:hidden')
        const boutons = [...points.querySelectorAll('button')]
        expect(boutons.map(b => b.getAttribute('aria-label')))
            .toEqual(['Matchs', 'Arrivées', 'Paiements'])
        expect(boutons[0]).toHaveAttribute('aria-current', 'true')
    })

    /*
     * La position se lit sur le defilement plutot que de se piloter : c'est le
     * doigt qui commande, et un etat qui pretendrait commander se
     * desynchroniserait au premier balayage.
     */
    it('suit la carte affichee quand on fait defiler', () => {
        const { container } = setup()
        const piste = container.querySelector('[data-carrousel]') as HTMLElement
        const points = () => [...container.querySelectorAll('[data-carrousel-points] button')]

        Object.defineProperty(piste, 'clientWidth', { value: 343, configurable: true })
        piste.scrollLeft = 686
        fireEvent.scroll(piste)

        expect(points()[2]).toHaveAttribute('aria-current', 'true')
        expect(points()[0]).not.toHaveAttribute('aria-current')
    })

    it('n\'affiche plus la carte Alertes, absente de la maquette', () => {
        const { container } = setup()
        expect(container.querySelector('[data-tuile="alertes"]')).toBeNull()
    })

    /*
     * Le titre ne redit pas le nom du club. Le fil d'Ariane l'affiche a
     * quelques pixels de la, dans son premier segment : le repeter sur la
     * meme horizontale prenait de la place pour rien.
     */
    it('ne redit pas le nom du club, que le fil d\'Ariane porte deja', () => {
        setup()
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
        expect(screen.queryByText(/Castle Club/)).not.toBeInTheDocument()
    })

    it('redirige un club sans evenement vers l\'onboarding', () => {
        mockUseEvent.mockReturnValue({
            currentEvent: null, currentRound: null, events: [], loading: false,
        })
        render(<AdminDashboard />)
        expect(screen.getByTestId('redirection')).toHaveTextContent('/admin/onboarding')
    })
})

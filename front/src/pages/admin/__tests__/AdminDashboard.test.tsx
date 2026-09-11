import { render, screen } from '@testing-library/react'
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
    it('pose deux colonnes, un rail de droite a largeur fixe', () => {
        const { container } = setup()
        const grille = container.querySelector('[data-tuile="matchs"]')!.parentElement!
        expect(grille.className).toContain('grid-cols-[1fr_360px]')
        expect(container.querySelector('.grid-cols-28')).toBeNull()
    })

    it('met les matchs a gauche, seuls', () => {
        const { container } = setup()
        const grille = container.querySelector('[data-tuile="matchs"]')!.parentElement!
        expect(grille.firstElementChild).toBe(container.querySelector('[data-tuile="matchs"]'))
    })

    // Les deux cartes du rail se partagent la hauteur en parts egales.
    it('empile inscrits et paiements a hauteur egale', () => {
        const { container } = setup()
        const rail = container.querySelector('[data-tuile="inscrits"]')!.parentElement!
        expect(rail.className).toContain('grid-rows-2')
        expect([...rail.children].map(e => e.getAttribute('data-tuile')))
            .toEqual(['inscrits', 'paiements'])
    })

    /*
     * Les trois cartes portent un `ScrollArea` en `h-full` : sans chaine de
     * `min-h-0` jusqu'a elles, elles cessent de defiler et poussent la page.
     */
    it('laisse chaque carte defiler dans sa boite', () => {
        const { container } = setup()
        for (const tuile of ['matchs', 'inscrits', 'paiements']) {
            expect(container.querySelector(`[data-tuile="${tuile}"]`)!.className)
                .toContain('min-h-0')
        }
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

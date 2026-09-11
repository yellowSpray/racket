import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppBreadcrumb } from '../AppBreadcrumb'

const mockUseEvent = vi.fn()
vi.mock('@/contexts/EventContext', () => ({
    useEvent: () => mockUseEvent(),
}))

const mockFetchClubConfig = vi.fn()
const mockUseClubConfig = vi.fn()
vi.mock('@/hooks/useClubConfig', () => ({
    useClubConfig: () => mockUseClubConfig(),
}))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ profile: { id: 'p1', club_id: 'c1', role: 'admin' } }),
}))

const rounds = [
    { id: 'r3', event_id: 'e1', round_number: 3, status: 'completed' },
    { id: 'r4', event_id: 'e1', round_number: 4, status: 'active' },
]

const events = [
    { id: 'e1', event_name: 'Mixed', event_rounds: rounds },
    { id: 'e2', event_name: 'Dames', event_rounds: [] },
]

function setup(over: Record<string, unknown> = {}) {
    const setCurrentEvent = vi.fn()
    const setCurrentRound = vi.fn()
    mockUseEvent.mockReturnValue({
        currentEvent: events[0],
        currentRound: rounds[1],
        events,
        loading: false,
        setCurrentEvent,
        setCurrentRound,
        ...over,
    })
    const vue = render(<AppBreadcrumb />)
    return { ...vue, setCurrentEvent, setCurrentRound }
}

describe('AppBreadcrumb', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockUseClubConfig.mockReturnValue({
            clubConfig: { id: 'c1', club_name: 'Castle Club' },
            fetchClubConfig: mockFetchClubConfig,
        })
    })

    /*
     * Chaque nom apparait deux fois : sur la pastille visible, et dans l'option
     * du `select` transparent qui la recouvre. D'ou `getAllByText`.
     */
    it('affiche le club, l\'evenement et la serie', () => {
        setup()
        expect(screen.getByText('Castle Club')).toBeInTheDocument()
        expect(screen.getAllByText('Mixed').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Série 4').length).toBeGreaterThan(0)
        expect(screen.getByLabelText('Événement')).toHaveValue('e1')
        expect(screen.getByLabelText('Série')).toHaveValue('r4')
    })

    it('charge la configuration du club a partir du profil', () => {
        setup()
        expect(mockFetchClubConfig).toHaveBeenCalledWith('c1')
    })

    /*
     * Les deux menus sont des `select` natifs posés par-dessus la pastille :
     * testables au clavier comme a la souris, et un selecteur natif sur
     * telephone, ce qui evitera un composant de plus au moment du responsive.
     */
    it('change d\'evenement', () => {
        const { setCurrentEvent } = setup()
        fireEvent.change(screen.getByLabelText('Événement'), { target: { value: 'e2' } })
        expect(setCurrentEvent).toHaveBeenCalledWith('e2')
    })

    it('change de serie', () => {
        const { setCurrentRound } = setup()
        fireEvent.change(screen.getByLabelText('Série'), { target: { value: 'r3' } })
        expect(setCurrentRound).toHaveBeenCalledWith('r3')
    })

    it('liste les series de l\'evenement courant, de la plus recente a la plus ancienne', () => {
        setup()
        const options = Array.from(
            screen.getByLabelText('Série').querySelectorAll('option'),
        ).map(o => o.textContent)
        expect(options).toEqual(['Série 4', 'Série 3'])
    })

    it('n\'affiche que le club tant qu\'aucun evenement n\'est charge', () => {
        setup({ currentEvent: null, currentRound: null, events: [] })
        expect(screen.getByText('Castle Club')).toBeInTheDocument()
        expect(screen.queryByLabelText('Événement')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Série')).not.toBeInTheDocument()
    })

    it('omet la serie quand l\'evenement n\'en a aucune', () => {
        setup({ currentEvent: events[1], currentRound: null })
        expect(screen.getByLabelText('Événement')).toBeInTheDocument()
        expect(screen.queryByLabelText('Série')).not.toBeInTheDocument()
    })

    /*
     * Un caractere « > » suit la fonte : sa graisse, sa taille et sa position
     * sur la ligne de base echappent au reglage. Un pictogramme se cale au
     * centre de la ligne et garde le meme trait que les chevrons voisins.
     */
    it('separe ses segments par un chevron dessine, pas par un caractere', () => {
        const { container } = setup()
        const separateurs = container.querySelectorAll('[data-crumb-separator]')
        expect(separateurs).toHaveLength(2)
        for (const s of separateurs) expect(s.tagName.toLowerCase()).toBe('svg')
        expect(container.textContent).not.toContain('/')
        expect(container.textContent).not.toContain('>')
    })

    it('donne une icone a l\'evenement comme au club', () => {
        const { container } = setup()
        expect(container.querySelector('[data-crumb-icon="club"]')).not.toBeNull()
        expect(container.querySelector('[data-crumb-icon="evenement"]')).not.toBeNull()
    })

    /*
     * Un seul chevron vers le bas se lit comme « deplier ». Les deux empiles
     * disent « choisir dans une liste », ce que ces segments font vraiment.
     */
    it('marque ses menus par deux chevrons empiles', () => {
        const { container } = setup()
        const marques = container.querySelectorAll('[data-crumb-chevrons]')
        expect(marques).toHaveLength(2)
        for (const m of marques) {
            // Un seul dessin qui porte les deux chevrons, et non deux icones
            // rapprochees a la marge : l'ecart entre elles doit etre exact.
            expect(m.tagName.toLowerCase()).toBe('svg')
            expect(m.querySelectorAll('path')).toHaveLength(2)
        }
    })

    it('n\'utilise pas de tiret cadratin', () => {
        setup()
        expect(document.body.textContent).not.toContain('—')
    })
})

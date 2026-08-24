import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AdminRoundConfig } from '../AdminRoundConfig'

const mockNavigate = vi.fn()
const mockParams: { eventId?: string; roundId?: string } = {}

vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
}))

const mockUseEvent = vi.fn()
vi.mock('@/contexts/EventContext', () => ({
    useEvent: () => mockUseEvent(),
}))

// Les portails du header sont rendus inline pour pouvoir les interroger
vi.mock('@/contexts/HeaderSlotContext', () => ({
    useHeaderSlot: (content: ReactNode) => content,
    useHeaderActions: (content: ReactNode) => content,
}))

// Les deux orchestrateurs reçoivent le bouton retour via `leading` et le rendent
// sur leur propre barre d'outils : on le restitue ici pour pouvoir l'interroger.
vi.mock('@/components/admin/settings/round/RoundWizardStepper', () => ({
    RoundWizardStepper: ({ leading }: { leading?: ReactNode }) =>
        <div data-testid="round-stepper">{leading}</div>,
}))

vi.mock('@/components/admin/settings/round/RoundSectionsEditor', () => ({
    RoundSectionsEditor: ({ leading }: { leading?: ReactNode }) =>
        <div data-testid="round-sections">{leading}</div>,
}))

const round = {
    id: 'r1', event_id: 'e1', round_number: 3,
    start_date: '2026-09-01', end_date: '2026-09-28',
    number_of_courts: 2, status: 'upcoming',
}
const event = { id: 'e1', club_id: 'c1', event_name: 'Interclub', event_rounds: [round] }

function setup({
    eventId = 'e1' as string | undefined,
    roundId = undefined as string | undefined,
    events = [event],
    loading = false,
} = {}) {
    mockParams.eventId = eventId
    mockParams.roundId = roundId
    mockUseEvent.mockReturnValue({ events, loading, fetchEvents: vi.fn() })
    return render(<AdminRoundConfig />)
}

describe('AdminRoundConfig', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockParams.eventId = undefined
        mockParams.roundId = undefined
    })

    it('affiche le stepper de creation quand aucune serie n\'est ciblee', () => {
        setup({ roundId: undefined })
        expect(screen.getByTestId('round-stepper')).toBeInTheDocument()
        expect(screen.queryByTestId('round-sections')).not.toBeInTheDocument()
    })

    it('affiche les sections d\'edition quand la serie existe', () => {
        setup({ roundId: 'r1' })
        expect(screen.getByTestId('round-sections')).toBeInTheDocument()
        expect(screen.queryByTestId('round-stepper')).not.toBeInTheDocument()
    })

    it('affiche le numero de la serie et le nom de l\'evenement en edition', () => {
        setup({ roundId: 'r1' })
        expect(screen.getByText(/Série 3/)).toBeInTheDocument()
        expect(screen.getByText(/Interclub/)).toBeInTheDocument()
    })

    it('annonce la prochaine serie en creation', () => {
        setup({ roundId: undefined })
        expect(screen.getByText(/Série 4/)).toBeInTheDocument()
    })

    it('propose un bouton de retour qui ramene aux parametres', () => {
        setup({ roundId: 'r1' })
        fireEvent.click(screen.getByRole('button', { name: /retour/i }))
        expect(mockNavigate).toHaveBeenCalledWith('/admin/settings')
    })

    it('affiche le libelle « Retour » sur le bouton', () => {
        setup({ roundId: 'r1' })
        expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument()
    })

    it('donne une taille explicite au bouton retour', () => {
        // `size` n'a pas de valeur par defaut dans buttonVariants : sans prop
        // explicite, le bouton se retrouve sans hauteur ni padding.
        setup({ roundId: 'r1' })
        expect(screen.getByRole('button', { name: 'Retour' })).toHaveClass('h-8')
    })

    it('place le bouton retour sur la barre d\'outils des sections, pas dans le header', () => {
        setup({ roundId: 'r1' })
        const back = screen.getByRole('button', { name: /retour/i })
        expect(screen.getByTestId('round-sections')).toContainElement(back)
    })

    it('place aussi le bouton retour dans le parcours de creation', () => {
        setup({ roundId: undefined })
        const back = screen.getByRole('button', { name: /retour/i })
        expect(screen.getByTestId('round-stepper')).toContainElement(back)
    })

    it('ne laisse que le titre dans le header', () => {
        setup({ roundId: 'r1' })
        // Le header ne porte plus de bouton : il ne reste que le libellé de la série
        expect(screen.getAllByRole('button', { name: /retour/i })).toHaveLength(1)
        expect(screen.getByText(/Série 3/)).toBeInTheDocument()
    })

    it('affiche un etat de chargement tant que les evenements ne sont pas charges', () => {
        setup({ roundId: 'r1', events: [], loading: true })
        expect(screen.getByText(/Chargement/i)).toBeInTheDocument()
        expect(screen.queryByTestId('round-sections')).not.toBeInTheDocument()
    })

    it('affiche un etat vide si l\'evenement est introuvable', () => {
        setup({ eventId: 'inconnu', roundId: 'r1' })
        expect(screen.getByText(/introuvable/i)).toBeInTheDocument()
    })

    it('affiche un etat vide si la serie est introuvable', () => {
        setup({ eventId: 'e1', roundId: 'inconnu' })
        expect(screen.getByText(/introuvable/i)).toBeInTheDocument()
    })
})

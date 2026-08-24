import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventsManager } from '../EventsManager'

const mockNavigate = vi.fn()
vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}))

const mockUseEvent = vi.fn()
vi.mock('@/contexts/EventContext', () => ({
    useEvent: () => mockUseEvent(),
}))

vi.mock('@/lib/supabaseClient', () => ({
    supabase: { from: vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn() })), delete: vi.fn(() => ({ eq: vi.fn() })) })) },
}))

vi.mock('../EventCreateWizardDialog', () => ({
    EventCreateWizardDialog: ({ open }: { open: boolean }) =>
        open ? <div data-testid="event-dialog" /> : null,
}))

const round = {
    id: 'r1', event_id: 'e1', round_number: 2,
    start_date: '2026-09-01', end_date: '2026-09-28',
    number_of_courts: 2, status: 'upcoming', player_count: 8,
}
const event = { id: 'e1', club_id: 'c1', event_name: 'Interclub', event_rounds: [round] }

function setup(events = [event], loading = false) {
    mockUseEvent.mockReturnValue({ events, loading, fetchEvents: vi.fn() })
    return render(<EventsManager />)
}

describe('EventsManager', () => {
    beforeEach(() => vi.clearAllMocks())

    it('navigue vers la page de la serie au clic sur une ligne', () => {
        setup()
        fireEvent.click(screen.getByText('Série 2'))
        expect(mockNavigate).toHaveBeenCalledWith('/admin/settings/events/e1/rounds/r1')
    })

    it('navigue vers la creation de serie au clic sur le bouton dedie', () => {
        setup()
        fireEvent.click(screen.getByText(/Créer la Série 3/))
        expect(mockNavigate).toHaveBeenCalledWith('/admin/settings/events/e1/rounds/new')
    })

    it('n\'ouvre plus de dialog pour la configuration de serie', () => {
        setup()
        fireEvent.click(screen.getByText('Série 2'))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('ouvre toujours le dialog evenement au clic sur le nom de l\'evenement', () => {
        setup()
        expect(screen.queryByTestId('event-dialog')).not.toBeInTheDocument()
        fireEvent.click(screen.getByText('Interclub'))
        expect(screen.getByTestId('event-dialog')).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('affiche l\'etat vide quand aucun evenement n\'existe', () => {
        setup([])
        expect(screen.getByText('Aucun événement')).toBeInTheDocument()
    })
})

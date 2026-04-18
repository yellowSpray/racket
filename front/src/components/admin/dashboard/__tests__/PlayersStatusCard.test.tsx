import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlayersStatusCard } from '../PlayersStatusCard'
import type { PlayerMovement } from '@/hooks/usePlayerMovements'
import type { VisitorRequest } from '@/types/visitor'

vi.mock('@/lib/formatRelativeTime', () => ({
    formatRelativeTime: vi.fn((date: string) => `mock-${date}`),
}))

const mockFetchPendingForEvent = vi.fn()
const mockReviewRequest = vi.fn().mockResolvedValue({ success: true })
let mockMovements: PlayerMovement[] = []
let mockMovementsLoading = false
let mockRequests: VisitorRequest[] = []
let mockRequestsLoading = false

vi.mock('@/hooks/usePlayerMovements', () => ({
    usePlayerMovements: () => ({
        movements: mockMovements,
        loading: mockMovementsLoading,
        error: null,
    }),
}))

vi.mock('@/hooks/useVisitorRequests', () => ({
    useVisitorRequests: () => ({
        requests: mockRequests,
        loading: mockRequestsLoading,
        error: null,
        fetchMyRequests: vi.fn(),
        fetchPendingForEvent: mockFetchPendingForEvent,
        createRequest: vi.fn(),
        cancelRequest: vi.fn(),
        reviewRequest: mockReviewRequest,
    }),
}))

function makeMovement(overrides: Partial<PlayerMovement> & { profileId: string }): PlayerMovement {
    return {
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'active',
        updatedAt: '2026-04-18T10:00:00Z',
        ...overrides,
    }
}

const sampleRequest: VisitorRequest = {
    id: 'req-1',
    event_id: 'ev1',
    profile_id: 'p1',
    status: 'pending',
    message: 'Je souhaite participer',
    created_at: '2026-04-18T10:00:00Z',
    updated_at: '2026-04-18T10:00:00Z',
    profile: {
        first_name: 'Bob',
        last_name: 'Dupont',
        email: 'bob@test.com',
        clubs: { club_name: 'Club Paris' },
    },
}

beforeEach(() => {
    vi.clearAllMocks()
    mockMovements = []
    mockMovementsLoading = false
    mockRequests = []
    mockRequestsLoading = false
})

describe('PlayersStatusCard', () => {
    it('shows "Inscrits" by default', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByText('Inscrits')).toBeInTheDocument()
    })

    it('prev button is disabled on first slide', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByLabelText('Slide précédent')).toBeDisabled()
    })

    it('next button is enabled on first slide', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByLabelText('Slide suivant')).not.toBeDisabled()
    })

    it('navigates to "Désinscrits" on next click', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByText('Désinscrits')).toBeInTheDocument()
    })

    it('navigates to "Liste d\'attente" after two next clicks', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByText("Liste d'attente")).toBeInTheDocument()
    })

    it('navigates to "Demandes visiteurs" after three next clicks', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByText('Demandes visiteurs')).toBeInTheDocument()
    })

    it('next button is disabled on last slide', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByLabelText('Slide suivant')).toBeDisabled()
    })

    it('shows loading state on Inscrits slide', () => {
        mockMovementsLoading = true
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('shows empty state when no movements', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByText('Aucun mouvement récent')).toBeInTheDocument()
    })

    it('shows player names for active movements', () => {
        mockMovements = [
            makeMovement({ profileId: 'p1', firstName: 'Alice', lastName: 'Martin', status: 'active' }),
        ]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('shows "Inscrit" badge for active movement', () => {
        mockMovements = [makeMovement({ profileId: 'p1', status: 'active' })]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByText('Inscrit')).toBeInTheDocument()
    })

    it('shows "Désinscrit" badge for inactive movement', () => {
        mockMovements = [makeMovement({ profileId: 'p1', status: 'inactive' })]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByText('Désinscrit')).toBeInTheDocument()
    })

    it('shows relative time for movements', () => {
        mockMovements = [makeMovement({ profileId: 'p1', updatedAt: '2026-04-18T10:00:00Z' })]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(screen.getByText('mock-2026-04-18T10:00:00Z')).toBeInTheDocument()
    })

    it('shows pending requests count badge on "Demandes visiteurs" slide', () => {
        mockRequests = [sampleRequest]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('calls fetchPendingForEvent on mount', () => {
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        expect(mockFetchPendingForEvent).toHaveBeenCalledWith('ev1')
    })

    it('does not fetch when eventId is null', () => {
        render(<PlayersStatusCard eventId={null} clubId="c1" />)
        expect(mockFetchPendingForEvent).not.toHaveBeenCalled()
    })

    it('shows visitor request data on "Demandes visiteurs" slide', () => {
        mockRequests = [sampleRequest]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
        expect(screen.getByText('Club Paris')).toBeInTheDocument()
    })

    it('calls reviewRequest with "approved" on approve click', async () => {
        mockRequests = [sampleRequest]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))

        fireEvent.click(screen.getByRole('button', { name: /accepter/i }))
        await waitFor(() => {
            expect(mockReviewRequest).toHaveBeenCalledWith('req-1', 'approved')
        })
    })

    it('calls reviewRequest with "rejected" on reject click', async () => {
        mockRequests = [sampleRequest]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))

        fireEvent.click(screen.getByRole('button', { name: /refuser/i }))
        await waitFor(() => {
            expect(mockReviewRequest).toHaveBeenCalledWith('req-1', 'rejected')
        })
    })

    it('refetches after approving a request', async () => {
        mockRequests = [sampleRequest]
        render(<PlayersStatusCard eventId="ev1" clubId="c1" />)
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))

        mockFetchPendingForEvent.mockClear()
        fireEvent.click(screen.getByRole('button', { name: /accepter/i }))
        await waitFor(() => {
            expect(mockFetchPendingForEvent).toHaveBeenCalledWith('ev1')
        })
    })
})

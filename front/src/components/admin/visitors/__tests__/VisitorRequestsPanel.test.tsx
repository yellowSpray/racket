import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VisitorRequestsPanel } from '../VisitorRequestsPanel'
import type { VisitorRequest } from '@/types/visitor'

const mockFetchPendingForEvent = vi.fn()
const mockReviewRequest = vi.fn().mockResolvedValue({ success: true })

let mockRequests: VisitorRequest[] = []
let mockLoading = false

vi.mock('@/components/ui/carousel', () => ({
    Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/hooks/useVisitorRequests', () => ({
    useVisitorRequests: () => ({
        requests: mockRequests,
        loading: mockLoading,
        error: null,
        fetchMyRequests: vi.fn(),
        fetchPendingForEvent: mockFetchPendingForEvent,
        createRequest: vi.fn(),
        cancelRequest: vi.fn(),
        reviewRequest: mockReviewRequest,
    }),
}))

const sampleRequests: VisitorRequest[] = [
    {
        id: 'req-1',
        event_id: 'evt-1',
        profile_id: 'p1',
        status: 'pending',
        message: 'Je souhaite participer au tournoi',
        created_at: '2026-03-10T14:30:00Z',
        updated_at: '2026-03-10T14:30:00Z',
        profile: {
            first_name: 'Alice',
            last_name: 'Martin',
            email: 'alice@test.com',
            clubs: { club_name: 'Club Paris' },
        },
    },
    {
        id: 'req-2',
        event_id: 'evt-1',
        profile_id: 'p2',
        status: 'pending',
        created_at: '2026-03-11T09:00:00Z',
        updated_at: '2026-03-11T09:00:00Z',
        profile: {
            first_name: 'Bob',
            last_name: 'Dupont',
            email: 'bob@test.com',
            clubs: { club_name: 'Club Lyon' },
        },
    },
]

describe('VisitorRequestsPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRequests = []
        mockLoading = false
    })

    it('should show "Liste d\'attente" title by default', () => {
        render(<VisitorRequestsPanel eventId="evt-1" />)
        expect(screen.getByText("Liste d'attente")).toBeInTheDocument()
    })

    it('should call fetchPendingForEvent with eventId on mount', () => {
        render(<VisitorRequestsPanel eventId="evt-1" />)
        expect(mockFetchPendingForEvent).toHaveBeenCalledWith('evt-1')
    })

    it('should not fetch when eventId is null', () => {
        render(<VisitorRequestsPanel eventId={null} />)
        expect(mockFetchPendingForEvent).not.toHaveBeenCalled()
    })

    it('should show empty state when no requests', () => {
        mockRequests = []
        render(<VisitorRequestsPanel eventId="evt-1" />)
        expect(screen.getByText('Aucune demande en attente')).toBeInTheDocument()
    })

    it('should show loading state', () => {
        mockLoading = true
        render(<VisitorRequestsPanel eventId="evt-1" />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('should show pending requests with player name and club name', () => {
        mockRequests = sampleRequests
        render(<VisitorRequestsPanel eventId="evt-1" />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Club Paris')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
        expect(screen.getByText('Club Lyon')).toBeInTheDocument()
    })

    it('should show optional message when present', () => {
        mockRequests = sampleRequests
        render(<VisitorRequestsPanel eventId="evt-1" />)
        expect(screen.getByText('Je souhaite participer au tournoi')).toBeInTheDocument()
    })

    it('should show waitlist placeholder on first slide', () => {
        render(<VisitorRequestsPanel eventId="evt-1" />)
        expect(screen.getByText(/en attente d'un groupe/)).toBeInTheDocument()
    })

    it('should call reviewRequest with "approved" on approve click', async () => {
        mockRequests = [sampleRequests[0]]
        render(<VisitorRequestsPanel eventId="evt-1" />)

        const approveButton = screen.getByRole('button', { name: /accepter/i })
        fireEvent.click(approveButton)

        await waitFor(() => {
            expect(mockReviewRequest).toHaveBeenCalledWith('req-1', 'approved')
        })
    })

    it('should call reviewRequest with "rejected" on reject click', async () => {
        mockRequests = [sampleRequests[0]]
        render(<VisitorRequestsPanel eventId="evt-1" />)

        const rejectButton = screen.getByRole('button', { name: /refuser/i })
        fireEvent.click(rejectButton)

        await waitFor(() => {
            expect(mockReviewRequest).toHaveBeenCalledWith('req-1', 'rejected')
        })
    })

    it('should refetch after approving a request', async () => {
        mockRequests = [sampleRequests[0]]
        render(<VisitorRequestsPanel eventId="evt-1" />)

        mockFetchPendingForEvent.mockClear()
        const approveButton = screen.getByRole('button', { name: /accepter/i })
        fireEvent.click(approveButton)

        await waitFor(() => {
            expect(mockFetchPendingForEvent).toHaveBeenCalledWith('evt-1')
        })
    })
})

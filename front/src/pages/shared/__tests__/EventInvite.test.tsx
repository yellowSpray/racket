import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockNavigate = vi.fn()
const mockFetchEventByToken = vi.fn()
const mockCreateRequest = vi.fn()

vi.mock('react-router', () => ({
    useParams: () => ({ token: 'test-token-123' }),
    useNavigate: () => mockNavigate,
}))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        profile: { id: 'u1', club_id: 'c1', first_name: 'Test', last_name: 'User', email: 'test@test.com', phone: '', role: 'user' as const },
    }),
}))

let mockEventInfo: Record<string, unknown> | null = null
let mockLoadingEvent = false
let mockEventError: string | null = null
let mockLoadingRequest = false

vi.mock('@/hooks/useInviteLink', () => ({
    useInviteLink: () => ({
        eventInfo: mockEventInfo,
        loading: mockLoadingEvent,
        error: mockEventError,
        fetchEventByToken: mockFetchEventByToken,
        getInviteUrl: vi.fn(),
    }),
}))

vi.mock('@/hooks/useVisitorRequests', () => ({
    useVisitorRequests: () => ({
        requests: [],
        loading: mockLoadingRequest,
        error: null,
        createRequest: mockCreateRequest,
        cancelRequest: vi.fn(),
        fetchMyRequests: vi.fn(),
        fetchPendingForEvent: vi.fn(),
        reviewRequest: vi.fn(),
    }),
}))

import { EventInvite } from '../EventInvite'

describe('EventInvite', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockEventInfo = null
        mockLoadingEvent = false
        mockEventError = null
        mockLoadingRequest = false
    })

    it('calls fetchEventByToken with token on mount', () => {
        mockEventInfo = {
            id: 'e1',
            event_name: 'Série 36',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            open_to_visitors: true,
            status: 'active',
            club_name: 'Beta Club',
            visitor_fee: 5,
        }

        render(<EventInvite />)

        expect(mockFetchEventByToken).toHaveBeenCalledWith('test-token-123')
    })

    it('shows event info when loaded', () => {
        mockEventInfo = {
            id: 'e1',
            event_name: 'Série 36',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            open_to_visitors: true,
            status: 'active',
            club_name: 'Beta Club',
            visitor_fee: 5,
        }

        render(<EventInvite />)

        expect(screen.getByText('Série 36')).toBeInTheDocument()
        expect(screen.getByText('Beta Club')).toBeInTheDocument()
        expect(screen.getByText(/5 €/)).toBeInTheDocument()
        expect(screen.getByText('Demander à rejoindre')).toBeInTheDocument()
    })

    it('shows error when event not found', () => {
        mockEventError = 'Lien invalide'

        render(<EventInvite />)

        expect(screen.getByText('Lien invalide')).toBeInTheDocument()
    })

    it('shows message when event is closed to visitors', () => {
        mockEventInfo = {
            id: 'e1',
            event_name: 'Série 36',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            open_to_visitors: false,
            status: 'active',
            club_name: 'Beta Club',
            visitor_fee: 0,
        }

        render(<EventInvite />)

        expect(screen.getByText(/n'accepte pas les visiteurs/)).toBeInTheDocument()
    })

    it('sends request and shows confirmation', async () => {
        mockEventInfo = {
            id: 'e1',
            event_name: 'Série 36',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            open_to_visitors: true,
            status: 'active',
            club_name: 'Beta Club',
            visitor_fee: 0,
        }

        mockCreateRequest.mockResolvedValueOnce({ success: true })

        render(<EventInvite />)

        fireEvent.click(screen.getByText('Demander à rejoindre'))

        await waitFor(() => {
            expect(mockCreateRequest).toHaveBeenCalledWith('e1', undefined)
        })

        await waitFor(() => {
            expect(screen.getByText(/demande a été envoyée/)).toBeInTheDocument()
        })
    })

    it('shows error when request fails', async () => {
        mockEventInfo = {
            id: 'e1',
            event_name: 'Série 36',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            open_to_visitors: true,
            status: 'active',
            club_name: 'Beta Club',
            visitor_fee: 0,
        }

        mockCreateRequest.mockResolvedValueOnce({ success: false, error: 'Déjà demandé' })

        render(<EventInvite />)

        fireEvent.click(screen.getByText('Demander à rejoindre'))

        await waitFor(() => {
            expect(screen.getByText('Déjà demandé')).toBeInTheDocument()
        })
    })
})

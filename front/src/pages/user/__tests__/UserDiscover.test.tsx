import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserDiscover } from '../UserDiscover'
import type { DiscoverableEvent } from '@/types/visitor'

// Mock data
let mockEvents: DiscoverableEvent[] = []
const mockFetchDiscoverableEvents = vi.fn()
const mockCreateRequest = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        profile: {
            id: 'u1',
            club_id: 'c1',
            first_name: 'Test',
            last_name: 'User',
            email: 'test@test.com',
            phone: '',
            role: 'user' as const,
        },
    }),
}))

vi.mock('@/hooks/useDiscoverEvents', () => ({
    useDiscoverEvents: () => ({
        events: mockEvents,
        loading: false,
        error: null,
        fetchDiscoverableEvents: mockFetchDiscoverableEvents,
    }),
}))

vi.mock('@/hooks/useVisitorRequests', () => ({
    useVisitorRequests: () => ({
        requests: [],
        loading: false,
        error: null,
        createRequest: mockCreateRequest,
        cancelRequest: vi.fn(),
        fetchMyRequests: vi.fn(),
        fetchPendingForEvent: vi.fn(),
        reviewRequest: vi.fn(),
    }),
}))

vi.mock('@/components/user/VisitorRequestDialog', () => ({
    VisitorRequestDialog: ({ open, onOpenChange: _onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
        open ? <div data-testid="visitor-request-dialog">Dialog</div> : null,
}))

const baseEvent: DiscoverableEvent = {
    id: 'e1',
    event_name: 'Tournoi Printemps',
    start_date: '2026-04-01',
    end_date: '2026-04-15',
    open_to_visitors: true,
    invite_token: 'tok1',
    club_id: 'c2',
    clubs: { club_name: 'Club Alpha', visitor_fee: 10 },
    player_count: 12,
    my_request_status: null,
}

describe('UserDiscover', () => {
    beforeEach(() => {
        mockEvents = [baseEvent]
        mockFetchDiscoverableEvents.mockClear()
        mockCreateRequest.mockClear()
    })

    it('renders the page title "Decouvrir"', () => {
        render(<UserDiscover />)
        expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Découvrir')
    })

    it('calls fetchDiscoverableEvents on mount with club_id', () => {
        render(<UserDiscover />)
        expect(mockFetchDiscoverableEvents).toHaveBeenCalledWith('c1')
    })

    it('renders event cards with club name and event name', () => {
        render(<UserDiscover />)
        expect(screen.getByText('Club Alpha')).toBeInTheDocument()
        expect(screen.getByText('Tournoi Printemps')).toBeInTheDocument()
    })

    it('shows formatted date range', () => {
        render(<UserDiscover />)
        expect(screen.getByText(/1 avr/i)).toBeInTheDocument()
    })

    it('shows player count', () => {
        render(<UserDiscover />)
        expect(screen.getByText(/12 joueurs inscrits/)).toBeInTheDocument()
    })

    it('shows visitor fee when > 0', () => {
        render(<UserDiscover />)
        expect(screen.getByText(/Frais visiteur/)).toBeInTheDocument()
        expect(screen.getByText(/10/)).toBeInTheDocument()
    })

    it('shows "Demander a rejoindre" button when no request exists', () => {
        render(<UserDiscover />)
        expect(screen.getByRole('button', { name: /demander à rejoindre/i })).toBeInTheDocument()
    })

    it('shows "En attente" badge for pending requests', () => {
        mockEvents = [{ ...baseEvent, my_request_status: 'pending' }]
        render(<UserDiscover />)
        expect(screen.getByText('En attente')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /demander à rejoindre/i })).not.toBeInTheDocument()
    })

    it('shows "Acceptee" badge for approved requests', () => {
        mockEvents = [{ ...baseEvent, my_request_status: 'approved' }]
        render(<UserDiscover />)
        expect(screen.getByText('Acceptée')).toBeInTheDocument()
    })

    it('shows "Refusee" badge and "Relancer" button for rejected requests', () => {
        mockEvents = [{ ...baseEvent, my_request_status: 'rejected' }]
        render(<UserDiscover />)
        expect(screen.getByText('Refusée')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /relancer/i })).toBeInTheDocument()
    })

    it('shows empty state when no events found', () => {
        mockEvents = []
        render(<UserDiscover />)
        expect(screen.getByText(/aucun événement/i)).toBeInTheDocument()
    })

    it('filters events by search input', () => {
        mockEvents = [
            baseEvent,
            {
                ...baseEvent,
                id: 'e2',
                event_name: 'Soiree Raquette',
                clubs: { club_name: 'Club Beta', visitor_fee: 0 },
            },
        ]
        render(<UserDiscover />)

        expect(screen.getByText('Tournoi Printemps')).toBeInTheDocument()
        expect(screen.getByText('Soiree Raquette')).toBeInTheDocument()

        const searchInput = screen.getByPlaceholderText(/rechercher/i)
        fireEvent.change(searchInput, { target: { value: 'Beta' } })

        expect(screen.queryByText('Tournoi Printemps')).not.toBeInTheDocument()
        expect(screen.getByText('Soiree Raquette')).toBeInTheDocument()
    })

    it('opens VisitorRequestDialog when clicking "Demander a rejoindre"', () => {
        render(<UserDiscover />)

        expect(screen.queryByTestId('visitor-request-dialog')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /demander à rejoindre/i }))

        expect(screen.getByTestId('visitor-request-dialog')).toBeInTheDocument()
    })

    it('does not show visitor fee when fee is 0', () => {
        mockEvents = [{ ...baseEvent, clubs: { club_name: 'Club Alpha', visitor_fee: 0 } }]
        render(<UserDiscover />)
        expect(screen.queryByText(/Frais visiteur/)).not.toBeInTheDocument()
    })
})

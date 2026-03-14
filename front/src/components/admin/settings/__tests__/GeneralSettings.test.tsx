import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockFetchClubConfig = vi.fn()
const mockUpdateClubDefaults = vi.fn()

let mockClubConfig: Record<string, unknown> | null = null
let mockCurrentEvent: Record<string, unknown> | null = null

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        profile: { id: 'u1', club_id: 'c1', first_name: 'Test', last_name: 'User', email: 'test@test.com', phone: '', role: 'admin' as const },
    }),
}))

vi.mock('@/contexts/EventContext', () => ({
    useEvent: () => ({
        currentEvent: mockCurrentEvent,
        events: mockCurrentEvent ? [mockCurrentEvent] : [],
        loading: false,
        error: null,
        setCurrentEvent: vi.fn(),
        fetchEvents: vi.fn(),
    }),
}))

vi.mock('@/hooks/useClubConfig', () => ({
    useClubConfig: () => ({
        clubConfig: mockClubConfig,
        scoringRules: null,
        promotionRules: null,
        loading: false,
        error: null,
        defaultScoring: {},
        defaultPromotion: {},
        fetchClubConfig: mockFetchClubConfig,
        updateClubDefaults: mockUpdateClubDefaults,
        upsertScoringRules: vi.fn(),
        upsertPromotionRules: vi.fn(),
    }),
}))

vi.mock('@/hooks/useInviteLink', () => ({
    useInviteLink: () => ({
        eventInfo: null,
        loading: false,
        error: null,
        fetchEventByToken: vi.fn(),
        getInviteUrl: (token: string) => `http://localhost:3000/events/join/${token}`,
    }),
}))

import { GeneralSettings } from '../GeneralSettings'

describe('GeneralSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockClubConfig = null
        mockCurrentEvent = null
    })

    it('shows visitor toggle unchecked when club open_to_visitors is false', () => {
        mockClubConfig = {
            id: 'c1',
            club_name: 'Test Club',
            open_to_visitors: false,
            visitor_fee: 5,
        }

        render(<GeneralSettings />)
        const checkbox = screen.getByRole('checkbox', { name: /Ouvert aux visiteurs/ })
        expect(checkbox).not.toBeChecked()
    })

    it('shows visitor toggle checked when club open_to_visitors is true', () => {
        mockClubConfig = {
            id: 'c1',
            club_name: 'Test Club',
            open_to_visitors: true,
            visitor_fee: 5,
        }

        render(<GeneralSettings />)
        const checkbox = screen.getByRole('checkbox', { name: /Ouvert aux visiteurs/ })
        expect(checkbox).toBeChecked()
    })

    it('shows invite link when open_to_visitors is true and event has token', () => {
        mockClubConfig = {
            id: 'c1',
            club_name: 'Test Club',
            open_to_visitors: true,
            visitor_fee: 5,
        }
        mockCurrentEvent = {
            id: 'e1',
            event_name: 'Série 36',
            club_id: 'c1',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            number_of_courts: 3,
            invite_token: 'token-123',
        }

        render(<GeneralSettings />)
        expect(screen.getByDisplayValue(/events\/join\/token-123/)).toBeInTheDocument()
    })

    it('hides invite link when open_to_visitors is false', () => {
        mockClubConfig = {
            id: 'c1',
            club_name: 'Test Club',
            open_to_visitors: false,
            visitor_fee: 5,
        }
        mockCurrentEvent = {
            id: 'e1',
            event_name: 'Série 36',
            club_id: 'c1',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            number_of_courts: 3,
            invite_token: 'token-123',
        }

        render(<GeneralSettings />)
        expect(screen.queryByDisplayValue(/events\/join/)).not.toBeInTheDocument()
    })

    it('shows copy button for invite link', () => {
        mockClubConfig = {
            id: 'c1',
            club_name: 'Test Club',
            open_to_visitors: true,
            visitor_fee: 5,
        }
        mockCurrentEvent = {
            id: 'e1',
            event_name: 'Série 36',
            club_id: 'c1',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            number_of_courts: 3,
            invite_token: 'token-123',
        }

        render(<GeneralSettings />)
        expect(screen.getByRole('button', { name: /Copier/ })).toBeInTheDocument()
    })

    it('shows club-level description text', () => {
        mockClubConfig = {
            id: 'c1',
            club_name: 'Test Club',
            open_to_visitors: false,
            visitor_fee: 5,
        }

        render(<GeneralSettings />)
        expect(screen.getByText(/événements de votre club/)).toBeInTheDocument()
    })

    it('calls fetchClubConfig on mount', () => {
        render(<GeneralSettings />)
        expect(mockFetchClubConfig).toHaveBeenCalledWith('c1')
    })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

let mockCurrentEvent: Record<string, unknown> | null = null

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
        mockCurrentEvent = null
    })

    it('shows invite link when event has token', () => {
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

    it('shows fallback text when no event selected', () => {
        render(<GeneralSettings />)
        expect(screen.getByText(/Sélectionnez un événement/)).toBeInTheDocument()
    })

    it('shows fallback text when event has no invite_token', () => {
        mockCurrentEvent = {
            id: 'e1',
            event_name: 'Série 36',
            club_id: 'c1',
            start_date: '2026-03-01',
            end_date: '2026-03-15',
            number_of_courts: 3,
        }

        render(<GeneralSettings />)
        expect(screen.getByText(/Sélectionnez un événement/)).toBeInTheDocument()
    })

    it('shows copy button for invite link', () => {
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

    it('shows event name as label when invite link is displayed', () => {
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
        expect(screen.getByText('Série 36')).toBeInTheDocument()
    })
})

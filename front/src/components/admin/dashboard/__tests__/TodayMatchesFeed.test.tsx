import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Match } from '@/types/match'

let mockMatches: Match[] = []
let mockMatchDate: string | null = null
let mockLoading = false

vi.mock('@/hooks/useTodayMatches', () => ({
    useTodayMatches: () => ({
        matches: mockMatches,
        matchDate: mockMatchDate,
        isToday: true,
        loading: mockLoading,
    }),
}))

import { TodayMatchesCard } from '../TodayMatchesCard'

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
    return {
        group_id: 'g1',
        player1_id: 'p1',
        player2_id: 'p2',
        match_date: '2026-03-08',
        match_time: '19:00:00+00',
        court_number: '1',
        winner_id: null,
        score: null,
        player1: { id: 'p1', first_name: 'Alice', last_name: 'Martin' },
        player2: { id: 'p2', first_name: 'Bob', last_name: 'Dupont' },
        group: { id: 'g1', group_name: 'Box A', event_id: 'e1' },
        ...overrides,
    }
}

describe('TodayMatchesCard', () => {
    beforeEach(() => {
        mockMatches = []
        mockMatchDate = null
        mockLoading = false
    })

    it('should show title "Matchs du jour"', () => {
        render(<TodayMatchesCard eventId="e1" />)
        expect(screen.getByText('Matchs du jour')).toBeInTheDocument()
    })

    it('should show empty state when no matches', () => {
        render(<TodayMatchesCard eventId="e1" />)
        expect(screen.getByText('Aucun match programmé')).toBeInTheDocument()
    })

    it('should show loading state', () => {
        mockLoading = true
        render(<TodayMatchesCard eventId="e1" />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('should display matches with player names', () => {
        mockMatchDate = '2026-03-08'
        mockMatches = [
            makeMatch({ id: 'm1', match_time: '19:00:00+00', court_number: '1' }),
            makeMatch({
                id: 'm2', match_time: '19:00:00+00', court_number: '2',
                player1: { id: 'p3', first_name: 'Claire', last_name: 'Roy' },
                player2: { id: 'p4', first_name: 'Dan', last_name: 'Simon' },
                group: { id: 'g2', group_name: 'Box B', event_id: 'e1' },
            }),
        ]

        render(<TodayMatchesCard eventId="e1" />)

        expect(screen.getAllByText('Alice Martin').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Claire Roy').length).toBeGreaterThanOrEqual(1)
    })

    it('should show score for played matches', () => {
        mockMatchDate = '2026-03-08'
        mockMatches = [makeMatch({ id: 'm1', winner_id: 'p1', score: '3-1' })]

        render(<TodayMatchesCard eventId="e1" />)
        expect(screen.getAllByText('3-1').length).toBeGreaterThanOrEqual(1)
    })

    it('should show "Absent" for ABS scores', () => {
        mockMatchDate = '2026-03-08'
        mockMatches = [makeMatch({ id: 'm1', winner_id: 'p2', score: 'ABS-0' })]

        render(<TodayMatchesCard eventId="e1" />)
        expect(screen.getAllByText('Absent').length).toBeGreaterThanOrEqual(1)
    })

    it('should show "en attente" for unplayed matches', () => {
        mockMatchDate = '2026-03-08'
        mockMatches = [makeMatch({ id: 'm1', winner_id: null, score: null })]

        render(<TodayMatchesCard eventId="e1" />)
        expect(screen.getAllByText('en attente').length).toBeGreaterThanOrEqual(1)
    })

    it('should show group badge', () => {
        mockMatchDate = '2026-03-08'
        mockMatches = [makeMatch({ id: 'm1' })]

        render(<TodayMatchesCard eventId="e1" />)
        expect(screen.getAllByText('Box A').length).toBeGreaterThanOrEqual(1)
    })
})

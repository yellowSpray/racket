import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TodayMatchesFeed } from '../TodayMatchesFeed'
import type { Match } from '@/types/match'

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

describe('TodayMatchesFeed', () => {
    it('should show empty state when no matches', () => {
        render(<TodayMatchesFeed matches={[]} matchDate={null} loading={false} />)
        expect(screen.getByText('Aucun match programmé')).toBeInTheDocument()
    })

    it('should show loading state', () => {
        render(<TodayMatchesFeed matches={[]} matchDate={null} loading={true} />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('should display matches grouped by time slot', () => {
        const matches: Match[] = [
            makeMatch({ id: 'm1', match_time: '19:00:00+00', court_number: '1' }),
            makeMatch({
                id: 'm2', match_time: '19:00:00+00', court_number: '2',
                player1: { id: 'p3', first_name: 'Claire', last_name: 'Roy' },
                player2: { id: 'p4', first_name: 'Dan', last_name: 'Simon' },
                group: { id: 'g2', group_name: 'Box B', event_id: 'e1' },
            }),
            makeMatch({
                id: 'm3', match_time: '19:30:00+00', court_number: '1',
                player1: { id: 'p5', first_name: 'Eve', last_name: 'Blanc' },
                player2: { id: 'p6', first_name: 'Fab', last_name: 'Morin' },
            }),
        ]

        render(<TodayMatchesFeed matches={matches} matchDate="2026-03-08" loading={false} />)

        expect(screen.getByText('19:00')).toBeInTheDocument()
        expect(screen.getByText('19:30')).toBeInTheDocument()
        // Both mobile and desktop render, so multiple elements expected
        expect(screen.getAllByText('Alice Martin').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Claire Roy').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Eve Blanc').length).toBeGreaterThanOrEqual(1)
    })

    it('should show score for played matches', () => {
        const matches: Match[] = [
            makeMatch({ id: 'm1', winner_id: 'p1', score: '3-1' }),
        ]

        render(<TodayMatchesFeed matches={matches} matchDate="2026-03-08" loading={false} />)
        expect(screen.getAllByText('3-1').length).toBeGreaterThanOrEqual(1)
    })

    it('should show "Absent" for ABS scores', () => {
        const matches: Match[] = [
            makeMatch({ id: 'm1', winner_id: 'p2', score: 'ABS-0' }),
        ]

        render(<TodayMatchesFeed matches={matches} matchDate="2026-03-08" loading={false} />)
        expect(screen.getAllByText('Absent').length).toBeGreaterThanOrEqual(1)
    })

    it('should show "en attente" for unplayed matches', () => {
        const matches: Match[] = [
            makeMatch({ id: 'm1', winner_id: null, score: null }),
        ]

        render(<TodayMatchesFeed matches={matches} matchDate="2026-03-08" loading={false} />)
        expect(screen.getAllByText('en attente').length).toBeGreaterThanOrEqual(1)
    })

    it('should show court number', () => {
        const matches: Match[] = [
            makeMatch({ id: 'm1', court_number: '2' }),
        ]

        render(<TodayMatchesFeed matches={matches} matchDate="2026-03-08" loading={false} />)
        expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    })

    it('should show group badge', () => {
        const matches: Match[] = [
            makeMatch({ id: 'm1' }),
        ]

        render(<TodayMatchesFeed matches={matches} matchDate="2026-03-08" loading={false} />)
        expect(screen.getAllByText('Box A').length).toBeGreaterThanOrEqual(1)
    })
})

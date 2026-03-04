import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { MatchScheduleGrid } from '../MatchScheduleGrid'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
import type { Match } from '@/types/match'
import type { Event } from '@/types/event'

// Mock MatchCell to simplify testing
vi.mock('../MatchCell', () => ({
  MatchCell: ({ match }: { match: Match | null }) =>
    match ? <div data-testid="match-cell">{match.player1_id} vs {match.player2_id}</div>
          : <div data-testid="match-cell-empty">—</div>
}))

// Mock matchScheduler
vi.mock('@/lib/matchScheduler', () => ({
  calculateTimeSlots: (_start: string, _end: string, _duration: number) => ['19:00', '19:30', '20:00'],
}))

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'e1',
  club_id: 'c1',
  event_name: 'Tournoi Test',
  start_date: '2026-03-01',
  end_date: '2026-03-02',
  start_time: '19:00',
  end_time: '23:00',
  number_of_courts: 2,
  estimated_match_duration: '00:30:00',
  ...overrides,
})

const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'm1',
  group_id: 'g1',
  player1_id: 'p1',
  player2_id: 'p2',
  match_date: '2026-03-01',
  match_time: '19:00:00',
  court_number: 'Terrain 1',
  winner_id: null,
  score: null,
  ...overrides,
})

describe('MatchScheduleGrid', () => {
  it('renders without crashing with empty matches', () => {
    render(<MatchScheduleGrid matches={[]} event={makeEvent()} />)
  })

  it('does not render any cards when there are no matches', () => {
    const { container } = render(<MatchScheduleGrid matches={[]} event={makeEvent()} />)
    // No dates means no cards
    expect(container.querySelectorAll('[class*="Card"]').length).toBe(0)
  })

  it('displays a date card when matches exist', () => {
    const matches = [makeMatch()]
    render(<MatchScheduleGrid matches={matches} event={makeEvent()} />)
    // Should display the formatted date label (French format)
    expect(screen.getByText(/mars/i)).toBeInTheDocument()
  })

  it('displays match count text', () => {
    const matches = [makeMatch()]
    render(<MatchScheduleGrid matches={matches} event={makeEvent()} />)
    expect(screen.getByText('1 match programmé')).toBeInTheDocument()
  })

  it('displays plural match count text for multiple matches', () => {
    const matches = [
      makeMatch({ id: 'm1', court_number: 'Terrain 1', match_time: '19:00:00' }),
      makeMatch({ id: 'm2', court_number: 'Terrain 2', match_time: '19:00:00' }),
    ]
    render(<MatchScheduleGrid matches={matches} event={makeEvent()} />)
    expect(screen.getByText('2 matchs programmés')).toBeInTheDocument()
  })

  it('displays court names from matches', () => {
    const matches = [
      makeMatch({ court_number: 'Court Central' }),
    ]
    render(<MatchScheduleGrid matches={matches} event={makeEvent()} />)
    expect(screen.getByText('Court Central')).toBeInTheDocument()
  })

  it('generates default court names when matches have no court_number', () => {
    const matches = [
      makeMatch({ court_number: null }),
    ]
    render(<MatchScheduleGrid matches={matches} event={makeEvent({ number_of_courts: 2 })} />)
    expect(screen.getByText('Terrain 1')).toBeInTheDocument()
    expect(screen.getByText('Terrain 2')).toBeInTheDocument()
  })

  it('displays time slots from calculateTimeSlots', () => {
    const matches = [makeMatch()]
    render(<MatchScheduleGrid matches={matches} event={makeEvent()} />)
    expect(screen.getByText('19:00')).toBeInTheDocument()
    expect(screen.getByText('19:30')).toBeInTheDocument()
    expect(screen.getByText('20:00')).toBeInTheDocument()
  })

  it('displays the "Heure" column header', () => {
    const matches = [makeMatch()]
    render(<MatchScheduleGrid matches={matches} event={makeEvent()} />)
    expect(screen.getByText('Heure')).toBeInTheDocument()
  })

  it('renders match cells for matching time and court', () => {
    const matches = [
      makeMatch({ match_time: '19:00:00', court_number: 'Terrain 1' }),
    ]
    render(<MatchScheduleGrid matches={matches} event={makeEvent()} />)
    expect(screen.getByText('p1 vs p2')).toBeInTheDocument()
  })

  it('groups matches by date and renders multiple cards', () => {
    const matches = [
      makeMatch({ id: 'm1', match_date: '2026-03-01' }),
      makeMatch({ id: 'm2', match_date: '2026-03-02' }),
    ]
    render(<MatchScheduleGrid matches={matches} event={makeEvent()} />)
    // Both dates should be shown
    const dateHeaders = screen.getAllByText(/mars/i)
    expect(dateHeaders.length).toBe(2)
  })
})

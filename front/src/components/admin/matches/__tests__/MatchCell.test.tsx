import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MatchCell } from '../MatchCell'
import type { Match } from '@/types/match'

const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  id: '1',
  group_id: 'g1',
  player1_id: 'p1',
  player2_id: 'p2',
  match_date: '2026-03-01',
  match_time: '10:00',
  court_number: null,
  winner_id: null,
  score: null,
  player1: { id: 'p1', first_name: 'Alice', last_name: 'Martin' },
  player2: { id: 'p2', first_name: 'Bob', last_name: 'Dupont' },
  group: { id: 'g1', group_name: 'Group A', event_id: 'e1' },
  ...overrides,
})

describe('MatchCell', () => {
  it('renders without crashing with a match', () => {
    render(<MatchCell match={makeMatch()} />)
  })

  it('renders without crashing with null', () => {
    render(<MatchCell match={null} />)
  })

  it('displays a dash when match is null', () => {
    render(<MatchCell match={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('displays player names formatted as "FirstName L."', () => {
    render(<MatchCell match={makeMatch()} />)
    expect(screen.getByText('Alice M.')).toBeInTheDocument()
    expect(screen.getByText('Bob D.')).toBeInTheDocument()
  })

  it('displays "vs" between players', () => {
    render(<MatchCell match={makeMatch()} />)
    expect(screen.getByText('vs')).toBeInTheDocument()
  })

  it('displays "?" when player1 is missing', () => {
    render(<MatchCell match={makeMatch({ player1: undefined })} />)
    const questions = screen.getAllByText('?')
    expect(questions.length).toBeGreaterThanOrEqual(1)
  })

  it('displays "?" when player2 is missing', () => {
    render(<MatchCell match={makeMatch({ player2: undefined })} />)
    const questions = screen.getAllByText('?')
    expect(questions.length).toBeGreaterThanOrEqual(1)
  })

  it('displays group name badge when group is present', () => {
    render(<MatchCell match={makeMatch()} />)
    expect(screen.getByText('Group A')).toBeInTheDocument()
  })

  it('does not display group badge when group is missing', () => {
    render(<MatchCell match={makeMatch({ group: undefined })} />)
    expect(screen.queryByText('Group A')).not.toBeInTheDocument()
  })

  it('does not display group badge when group_name is empty', () => {
    render(
      <MatchCell
        match={makeMatch({ group: { id: 'g1', group_name: '', event_id: 'e1' } })}
      />
    )
    // Empty string is falsy, so badge should not render
    expect(screen.queryByText('Group A')).not.toBeInTheDocument()
  })
})

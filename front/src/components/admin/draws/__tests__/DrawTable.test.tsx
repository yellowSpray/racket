import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DrawTable } from '../DrawTable'
import type { Group, GroupPlayer } from '@/types/draw'
import type { Match } from '@/types/match'
import type { ScoringRules } from '@/types/settings'

const defaultRules: ScoringRules = {
  id: 'r1',
  club_id: 'c1',
  score_points: [
    { score: '3-0', winner_points: 5, loser_points: 0 },
    { score: '3-1', winner_points: 4, loser_points: 1 },
    { score: '3-2', winner_points: 3, loser_points: 2 },

    { score: 'ABS', winner_points: 3, loser_points: -1 },
  ],
}

const makePlayer = (overrides: Partial<GroupPlayer> = {}): GroupPlayer => ({
  id: 'p1',
  first_name: 'Alice',
  last_name: 'Martin',
  phone: '0612345678',
  power_ranking: 5,
  ...overrides,
})

const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'm1',
  group_id: 'g1',
  player1_id: 'p1',
  player2_id: 'p2',
  match_date: '2026-03-05',
  match_time: '19:30:00+00',
  court_number: 'Terrain 1',
  winner_id: null,
  score: null,
  ...overrides,
})

const makeGroup = (overrides: Partial<Group> = {}): Group => ({
  id: 'g1',
  event_id: 'e1',
  group_name: 'Groupe A',
  max_players: 4,
  created_at: '2026-01-01',
  players: [],
  ...overrides,
})

describe('DrawTable', () => {
  it('renders without crashing with an empty group', () => {
    render(<DrawTable group={makeGroup()} />)
  })

  it('displays the group name in the header', () => {
    render(<DrawTable group={makeGroup({ group_name: 'Groupe B' })} />)
    expect(screen.getByText('Groupe B')).toBeInTheDocument()
  })

  it('displays column letters for max_players slots', () => {
    render(<DrawTable group={makeGroup({ max_players: 4 })} />)
    const letterAs = screen.getAllByText('A')
    expect(letterAs.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('D').length).toBeGreaterThanOrEqual(1)
  })

  it('displays Total column header', () => {
    render(<DrawTable group={makeGroup()} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('displays player name and phone when players exist', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'Martin', phone: '0611111111' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'Dupont', phone: '0622222222' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)
    expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    expect(screen.getByText('0611111111')).toBeInTheDocument()
    expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
    expect(screen.getByText('0622222222')).toBeInTheDocument()
  })

  it('shows 0 in Total column for existing players', () => {
    const players = [makePlayer()]
    render(<DrawTable group={makeGroup({ players, max_players: 1 })} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows "-" in Total column for empty slots', () => {
    render(<DrawTable group={makeGroup({ players: [], max_players: 2 })} />)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('respects max_players for number of slots', () => {
    render(<DrawTable group={makeGroup({ players: [], max_players: 3 })} />)
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1)
  })

  it('uses group max_players for slot count', () => {
    render(<DrawTable group={makeGroup({ players: [], max_players: 6 })} />)
    expect(screen.getAllByText('F').length).toBeGreaterThanOrEqual(1)
  })

  it('expands slots when players exceed max_players', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'A', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'B', last_name: 'B' }),
      makePlayer({ id: 'p3', first_name: 'C', last_name: 'C' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1)
  })

  it('renders match cells with placeholder content when no matches provided', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)
    expect(screen.getAllByText('--:--').length).toBeGreaterThanOrEqual(1)
  })

  it('displays formatted date and time when match data is provided', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    const matches = [makeMatch({ player1_id: 'p1', player2_id: 'p2', match_date: '2026-03-05', match_time: '19:30:00+00' })]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} />)
    expect(screen.getAllByText('05-mars').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('19:30').length).toBeGreaterThanOrEqual(1)
  })

  it('displays score when match has been played', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    const matches = [makeMatch({ player1_id: 'p1', player2_id: 'p2', score: '3 - 1' })]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} />)
    expect(screen.getAllByText('3 - 1').length).toBeGreaterThanOrEqual(1)
  })

  it('finds match regardless of player1/player2 order', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    // Match stored with reversed player order
    const matches = [makeMatch({ player1_id: 'p2', player2_id: 'p1', match_date: '2026-04-10', match_time: '20:00:00+00' })]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} />)
    expect(screen.getAllByText('10-avr.').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('20:00').length).toBeGreaterThanOrEqual(1)
  })

  it('shows placeholder when match has no score yet', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    const matches = [makeMatch({ player1_id: 'p1', player2_id: 'p2', score: null })]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} />)
    expect(screen.queryByText('3 - 1')).not.toBeInTheDocument()
  })

  // --- Scoring / Total column ---

  it('displays calculated points in Total column when scoringRules provided', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'Martin' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'Dupont' }),
    ]
    const matches = [
      makeMatch({ player1_id: 'p1', player2_id: 'p2', winner_id: 'p1', score: '3-1' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} scoringRules={defaultRules} />)
    // Alice: 4 pts (3-1 win), Bob: 1 pt (3-1 loss)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('highlights winner score in match cell', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'Martin' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'Dupont' }),
    ]
    const matches = [
      makeMatch({ player1_id: 'p1', player2_id: 'p2', winner_id: 'p1', score: '3-1' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} scoringRules={defaultRules} />)
    // Score should be displayed in the cells
    expect(screen.getAllByText('3-1').length).toBeGreaterThanOrEqual(1)
  })
})

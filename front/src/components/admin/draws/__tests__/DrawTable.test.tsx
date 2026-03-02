import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DrawTable } from '../DrawTable'
import type { Group, GroupPlayer } from '@/types/draw'

const makePlayer = (overrides: Partial<GroupPlayer> = {}): GroupPlayer => ({
  id: 'p1',
  first_name: 'Alice',
  last_name: 'Martin',
  phone: '0612345678',
  power_ranking: '5',
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

  it('renders match cells with placeholder content for valid matches', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)
    expect(screen.getAllByText('--:--').length).toBeGreaterThanOrEqual(1)
  })
})

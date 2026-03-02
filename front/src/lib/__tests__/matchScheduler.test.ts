import { describe, it, expect } from 'vitest'
import type { Group, GroupPlayer } from '@/types/draw'
import type { MatchPairing } from '@/types/match'
import {
  generateRoundRobinPairings,
  calculateTimeSlots,
  calculateDates,
  assignMatchesToSlots,
  totalMatchCount,
  totalSlotCount,
  type PlayerConstraints,
} from '@/lib/matchScheduler'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(id: string, firstName = 'Player', lastName = id): GroupPlayer {
  return {
    id,
    first_name: firstName,
    last_name: lastName,
    phone: '0000',
    power_ranking: '0',
  }
}

function makeGroup(id: string, name: string, players: GroupPlayer[], maxPlayers = 6): Group {
  return {
    id,
    event_id: 'evt-1',
    group_name: name,
    max_players: maxPlayers,
    created_at: '',
    players,
  }
}

// ---------------------------------------------------------------------------
// generateRoundRobinPairings
// ---------------------------------------------------------------------------

describe('generateRoundRobinPairings', () => {
  it('returns empty array for empty groups', () => {
    expect(generateRoundRobinPairings([])).toEqual([])
  })

  it('returns empty array for a group with no players', () => {
    const groups = [makeGroup('g1', 'Group A', [])]
    expect(generateRoundRobinPairings(groups)).toEqual([])
  })

  it('returns empty array for a single-player group', () => {
    const groups = [makeGroup('g1', 'Group A', [makePlayer('p1')])]
    expect(generateRoundRobinPairings(groups)).toEqual([])
  })

  it('generates 1 pairing for 2 players', () => {
    const groups = [makeGroup('g1', 'Group A', [makePlayer('p1'), makePlayer('p2')])]
    const result = generateRoundRobinPairings(groups)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      groupId: 'g1',
      groupName: 'Group A',
      player1Id: 'p1',
      player2Id: 'p2',
    })
  })

  it('generates 3 pairings for 3 players (n*(n-1)/2)', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')]
    const groups = [makeGroup('g1', 'Group A', players)]
    const result = generateRoundRobinPairings(groups)

    expect(result).toHaveLength(3)
    const pairIds = result.map((p) => `${p.player1Id}-${p.player2Id}`)
    expect(pairIds).toContain('p1-p2')
    expect(pairIds).toContain('p1-p3')
    expect(pairIds).toContain('p2-p3')
  })

  it('generates 6 pairings for 4 players', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4')]
    const groups = [makeGroup('g1', 'Group A', players)]
    const result = generateRoundRobinPairings(groups)

    expect(result).toHaveLength(6)
  })

  it('interleaves pairings from multiple groups', () => {
    const groupA = makeGroup('gA', 'Group A', [makePlayer('a1'), makePlayer('a2'), makePlayer('a3')])
    const groupB = makeGroup('gB', 'Group B', [makePlayer('b1'), makePlayer('b2'), makePlayer('b3')])
    const result = generateRoundRobinPairings([groupA, groupB])

    // 3 pairings per group = 6 total
    expect(result).toHaveLength(6)

    // Interleaved: first from A, then B, then A, then B, ...
    expect(result[0].groupId).toBe('gA')
    expect(result[1].groupId).toBe('gB')
    expect(result[2].groupId).toBe('gA')
    expect(result[3].groupId).toBe('gB')
    expect(result[4].groupId).toBe('gA')
    expect(result[5].groupId).toBe('gB')
  })

  it('interleaves correctly when groups have different sizes', () => {
    const groupA = makeGroup('gA', 'Group A', [makePlayer('a1'), makePlayer('a2')]) // 1 pairing
    const groupB = makeGroup('gB', 'Group B', [makePlayer('b1'), makePlayer('b2'), makePlayer('b3')]) // 3 pairings
    const result = generateRoundRobinPairings([groupA, groupB])

    expect(result).toHaveLength(4)
    // First round: one from A, one from B
    expect(result[0].groupId).toBe('gA')
    expect(result[1].groupId).toBe('gB')
    // A is exhausted, remaining from B
    expect(result[2].groupId).toBe('gB')
    expect(result[3].groupId).toBe('gB')
  })

  it('builds correct player names from first_name and last_name', () => {
    const groups = [
      makeGroup('g1', 'Group A', [
        makePlayer('p1', 'Alice', 'Smith'),
        makePlayer('p2', 'Bob', 'Jones'),
      ]),
    ]
    const result = generateRoundRobinPairings(groups)

    expect(result[0].player1Name).toBe('Alice Smith')
    expect(result[0].player2Name).toBe('Bob Jones')
  })

  it('handles group with undefined players property', () => {
    const group: Group = {
      id: 'g1',
      event_id: 'evt-1',
      group_name: 'Group A',
      max_players: 6,
      created_at: '',
      // players not set (undefined)
    }
    expect(generateRoundRobinPairings([group])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// calculateTimeSlots
// ---------------------------------------------------------------------------

describe('calculateTimeSlots', () => {
  it('generates correct slots for a basic range', () => {
    const result = calculateTimeSlots('18:00', '20:00', 30)
    expect(result).toEqual(['18:00', '18:30', '19:00', '19:30'])
  })

  it('handles exact fit (no leftover time)', () => {
    const result = calculateTimeSlots('09:00', '10:00', 30)
    expect(result).toEqual(['09:00', '09:30'])
  })

  it('returns single slot when duration equals range', () => {
    const result = calculateTimeSlots('19:00', '20:00', 60)
    expect(result).toEqual(['19:00'])
  })

  it('returns empty array when no room for even one slot', () => {
    const result = calculateTimeSlots('19:00', '19:20', 30)
    expect(result).toEqual([])
  })

  it('returns empty array when start equals end', () => {
    const result = calculateTimeSlots('18:00', '18:00', 30)
    expect(result).toEqual([])
  })

  it('handles non-round start times', () => {
    const result = calculateTimeSlots('18:15', '19:15', 30)
    expect(result).toEqual(['18:15', '18:45'])
  })

  it('pads single-digit hours with leading zero', () => {
    const result = calculateTimeSlots('9:00', '10:00', 30)
    expect(result).toEqual(['09:00', '09:30'])
  })

  it('handles large durations', () => {
    const result = calculateTimeSlots('08:00', '12:00', 120)
    expect(result).toEqual(['08:00', '10:00'])
  })

  it('excludes slot that would overflow past end time', () => {
    // 45-min slots from 18:00 to 20:00 => 18:00 (18:45 ok), 18:45 (19:30 ok), but 19:30+45=20:15 > 20:00 so excluded
    const result = calculateTimeSlots('18:00', '20:00', 45)
    expect(result).toEqual(['18:00', '18:45'])
  })
})

// ---------------------------------------------------------------------------
// calculateDates
// ---------------------------------------------------------------------------

describe('calculateDates', () => {
  it('generates all dates in a range (inclusive)', () => {
    const result = calculateDates('2026-03-01', '2026-03-03')
    expect(result).toEqual(['2026-03-01', '2026-03-02', '2026-03-03'])
  })

  it('returns single date when start equals end', () => {
    const result = calculateDates('2026-03-01', '2026-03-01')
    expect(result).toEqual(['2026-03-01'])
  })

  it('uses playingDates directly when provided and non-empty', () => {
    const result = calculateDates('2026-03-01', '2026-03-10', ['2026-03-05', '2026-03-02', '2026-03-08'])
    // Should be sorted
    expect(result).toEqual(['2026-03-02', '2026-03-05', '2026-03-08'])
  })

  it('falls back to range when playingDates is empty array', () => {
    const result = calculateDates('2026-03-01', '2026-03-02', [])
    expect(result).toEqual(['2026-03-01', '2026-03-02'])
  })

  it('falls back to range when playingDates is null', () => {
    const result = calculateDates('2026-03-01', '2026-03-02', null)
    expect(result).toEqual(['2026-03-01', '2026-03-02'])
  })

  it('falls back to range when playingDates is undefined', () => {
    const result = calculateDates('2026-03-01', '2026-03-02', undefined)
    expect(result).toEqual(['2026-03-01', '2026-03-02'])
  })

  it('sorts playingDates that are provided out of order', () => {
    const result = calculateDates('2026-01-01', '2026-12-31', ['2026-06-15', '2026-01-10', '2026-03-20'])
    expect(result).toEqual(['2026-01-10', '2026-03-20', '2026-06-15'])
  })
})

// ---------------------------------------------------------------------------
// totalMatchCount
// ---------------------------------------------------------------------------

describe('totalMatchCount', () => {
  it('returns 0 for empty groups array', () => {
    expect(totalMatchCount([])).toBe(0)
  })

  it('returns 0 for group with no players', () => {
    expect(totalMatchCount([makeGroup('g1', 'A', [])])).toBe(0)
  })

  it('returns 0 for group with 1 player', () => {
    expect(totalMatchCount([makeGroup('g1', 'A', [makePlayer('p1')])])).toBe(0)
  })

  it('returns 1 for 2 players', () => {
    expect(totalMatchCount([makeGroup('g1', 'A', [makePlayer('p1'), makePlayer('p2')])])).toBe(1)
  })

  it('returns 3 for 3 players', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')]
    expect(totalMatchCount([makeGroup('g1', 'A', players)])).toBe(3)
  })

  it('returns 6 for 4 players', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4')]
    expect(totalMatchCount([makeGroup('g1', 'A', players)])).toBe(6)
  })

  it('sums across multiple groups', () => {
    const groupA = makeGroup('gA', 'A', [makePlayer('a1'), makePlayer('a2'), makePlayer('a3')]) // 3
    const groupB = makeGroup('gB', 'B', [makePlayer('b1'), makePlayer('b2')]) // 1
    expect(totalMatchCount([groupA, groupB])).toBe(4)
  })

  it('handles group with undefined players', () => {
    const group: Group = {
      id: 'g1',
      event_id: 'evt-1',
      group_name: 'A',
      max_players: 6,
      created_at: '',
    }
    expect(totalMatchCount([group])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// totalSlotCount
// ---------------------------------------------------------------------------

describe('totalSlotCount', () => {
  it('returns product of dates, time slots, and courts', () => {
    expect(totalSlotCount(3, 4, 2)).toBe(24)
  })

  it('returns 0 when any dimension is 0', () => {
    expect(totalSlotCount(0, 4, 2)).toBe(0)
    expect(totalSlotCount(3, 0, 2)).toBe(0)
    expect(totalSlotCount(3, 4, 0)).toBe(0)
  })

  it('returns correct value for single slot', () => {
    expect(totalSlotCount(1, 1, 1)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// assignMatchesToSlots
// ---------------------------------------------------------------------------

describe('assignMatchesToSlots', () => {
  const dates = ['2026-03-01']
  const timeSlots = ['18:00', '18:30', '19:00']
  const numberOfCourts = 2

  function makePairing(
    groupId: string,
    p1: string,
    p2: string,
    groupName = 'Group A',
  ): MatchPairing {
    return {
      groupId,
      groupName,
      player1Id: p1,
      player2Id: p2,
      player1Name: `Player ${p1}`,
      player2Name: `Player ${p2}`,
    }
  }

  it('assigns a single match to the first available slot', () => {
    const pairings = [makePairing('g1', 'p1', 'p2')]
    const result = assignMatchesToSlots(pairings, dates, timeSlots, numberOfCourts)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      matchDate: '2026-03-01',
      matchTime: '18:00',
      courtNumber: 'Terrain 1',
      player1Id: 'p1',
      player2Id: 'p2',
    })
  })

  it('assigns two independent matches to the same time slot on different courts', () => {
    const pairings = [
      makePairing('g1', 'p1', 'p2'),
      makePairing('g1', 'p3', 'p4'),
    ]
    const result = assignMatchesToSlots(pairings, dates, timeSlots, numberOfCourts)

    expect(result).toHaveLength(2)
    // Both at 18:00 since no player conflict
    expect(result[0].matchTime).toBe('18:00')
    expect(result[1].matchTime).toBe('18:00')
    expect(result[0].courtNumber).toBe('Terrain 1')
    expect(result[1].courtNumber).toBe('Terrain 2')
  })

  it('prevents a player from playing two matches at the same time', () => {
    // p1 vs p2 and p1 vs p3: p1 can't play both at the same slot
    const pairings = [
      makePairing('g1', 'p1', 'p2'),
      makePairing('g1', 'p1', 'p3'),
    ]
    const result = assignMatchesToSlots(pairings, dates, timeSlots, numberOfCourts)

    expect(result).toHaveLength(2)
    // They must be at different time slots
    expect(result[0].matchTime).not.toBe(result[1].matchTime)
  })

  it('respects court capacity (cannot exceed numberOfCourts per slot)', () => {
    const pairings = [
      makePairing('g1', 'p1', 'p2'),
      makePairing('g1', 'p3', 'p4'),
      makePairing('g1', 'p5', 'p6'),
    ]
    // Only 2 courts, so third match goes to next time slot
    const result = assignMatchesToSlots(pairings, dates, timeSlots, numberOfCourts)

    expect(result).toHaveLength(3)
    const firstSlotMatches = result.filter((a) => a.matchTime === '18:00')
    const secondSlotMatches = result.filter((a) => a.matchTime === '18:30')
    expect(firstSlotMatches).toHaveLength(2)
    expect(secondSlotMatches).toHaveLength(1)
  })

  it('drops matches when there are more pairings than available slots', () => {
    const singleSlot = ['18:00']
    const pairings = [
      makePairing('g1', 'p1', 'p2'),
      makePairing('g1', 'p3', 'p4'),
      makePairing('g1', 'p5', 'p6'), // no room (only 2 courts, 1 time slot)
    ]
    const result = assignMatchesToSlots(pairings, dates, singleSlot, 2)

    expect(result).toHaveLength(2)
  })

  it('spreads matches across multiple dates', () => {
    const twoDates = ['2026-03-01', '2026-03-02']
    const singleSlot = ['18:00']
    const pairings = [
      makePairing('g1', 'p1', 'p2'),
      makePairing('g1', 'p3', 'p4'),
      makePairing('g1', 'p5', 'p6'),
    ]
    const result = assignMatchesToSlots(pairings, twoDates, singleSlot, 2)

    expect(result).toHaveLength(3)
    const day1 = result.filter((a) => a.matchDate === '2026-03-01')
    const day2 = result.filter((a) => a.matchDate === '2026-03-02')
    expect(day1).toHaveLength(2)
    expect(day2).toHaveLength(1)
  })

  it('returns empty array when no pairings provided', () => {
    const result = assignMatchesToSlots([], dates, timeSlots, numberOfCourts)
    expect(result).toEqual([])
  })

  it('returns empty array when no dates provided', () => {
    const pairings = [makePairing('g1', 'p1', 'p2')]
    const result = assignMatchesToSlots(pairings, [], timeSlots, numberOfCourts)
    expect(result).toEqual([])
  })

  it('returns empty array when no time slots provided', () => {
    const pairings = [makePairing('g1', 'p1', 'p2')]
    const result = assignMatchesToSlots(pairings, dates, [], numberOfCourts)
    expect(result).toEqual([])
  })

  // -------------------------------------------------------------------------
  // Player constraints
  // -------------------------------------------------------------------------

  describe('with player constraints', () => {
    it('skips slots before player arrival time', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '18:45', departure: '', unavailable: [] })

      const pairings = [makePairing('g1', 'p1', 'p2')]
      const result = assignMatchesToSlots(pairings, dates, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      // p1 arrives at 18:45, so 18:00 and 18:30 slots are too early
      expect(result[0].matchTime).toBe('19:00')
    })

    it('skips slots where match would end after player departure', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p2', { arrival: '', departure: '18:45', unavailable: [] })

      const pairings = [makePairing('g1', 'p1', 'p2')]
      // With 30 min duration: 18:00 slot ends at 18:30 (OK), 18:30 ends at 19:00 (> 18:45)
      const result = assignMatchesToSlots(pairings, dates, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('18:00')
    })

    it('skips dates where a player is unavailable', () => {
      const twoDates = ['2026-03-01', '2026-03-02']
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '', departure: '', unavailable: ['2026-03-01'] })

      const pairings = [makePairing('g1', 'p1', 'p2')]
      const result = assignMatchesToSlots(pairings, twoDates, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchDate).toBe('2026-03-02')
    })

    it('handles multiple constraints simultaneously', () => {
      const twoDates = ['2026-03-01', '2026-03-02']
      const slots = ['18:00', '18:30', '19:00', '19:30']
      const constraints = new Map<string, PlayerConstraints>()
      // p1 is absent on day 1 and arrives at 19:00 on day 2
      constraints.set('p1', { arrival: '19:00', departure: '', unavailable: ['2026-03-01'] })

      const pairings = [makePairing('g1', 'p1', 'p2')]
      const result = assignMatchesToSlots(pairings, twoDates, slots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchDate).toBe('2026-03-02')
      expect(result[0].matchTime).toBe('19:00')
    })

    it('assigns matches normally for players without constraints', () => {
      const constraints = new Map<string, PlayerConstraints>()
      // Only p3 has constraints, but the match is p1 vs p2
      constraints.set('p3', { arrival: '22:00', departure: '', unavailable: ['2026-03-01'] })

      const pairings = [makePairing('g1', 'p1', 'p2')]
      const result = assignMatchesToSlots(pairings, dates, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('18:00')
    })

    it('drops match when player is unavailable on all dates and times', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '', departure: '', unavailable: ['2026-03-01'] })

      const pairings = [makePairing('g1', 'p1', 'p2')]
      // Only one date and p1 is unavailable that day
      const result = assignMatchesToSlots(pairings, ['2026-03-01'], timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(0)
    })

    it('uses default 30 minute duration when durationMinutes is not provided', () => {
      const constraints = new Map<string, PlayerConstraints>()
      // Departure at 18:25 means a 30-min match starting at 18:00 (ending 18:30) should be skipped
      constraints.set('p1', { arrival: '', departure: '18:25', unavailable: [] })

      const pairings = [makePairing('g1', 'p1', 'p2')]
      const result = assignMatchesToSlots(pairings, dates, ['18:00'], numberOfCourts, constraints)

      // Default duration is 30 min, 18:00 + 30 = 18:30 > 18:25, so no match
      expect(result).toHaveLength(0)
    })
  })
})

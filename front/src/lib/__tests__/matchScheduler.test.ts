import { describe, it, expect } from 'vitest'
import type { Group, GroupPlayer } from '@/types/draw'
import type { MatchPairing } from '@/types/match'
import {
  generateRoundRobinPairings,
  generateGroupRounds,
  mapRoundsToDates,
  assignTimeSlotsForDates,
  calculateTimeSlots,
  calculateDates,
  totalMatchCount,
  totalSlotCount,
  validateMatchSlot,
  type PlayerConstraints,
  type DatePlan,
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
    power_ranking: 0,
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

/** Crée un DatePlan simple avec des pairings sur une date */
function makeDatePlan(date: string, pairings: MatchPairing[]): DatePlan {
  return { date, pairings }
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
    const pairIds = result.map((p) => [p.player1Id, p.player2Id].sort().join('-'))
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

  it('generates pairings in round order (no player plays twice in same round)', () => {
    // 5 players → 5 rounds of 2 matches each (1 bye per round)
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4'), makePlayer('p5')]
    const groups = [makeGroup('g1', 'Group A', players)]
    const result = generateRoundRobinPairings(groups)

    expect(result).toHaveLength(10) // C(5,2) = 10

    // Check that pairings are in round order:
    // Each round has floor(5/2)=2 matches, so indices [0,1], [2,3], [4,5], [6,7], [8,9]
    for (let round = 0; round < 5; round++) {
      const roundStart = round * 2
      const roundPairings = result.slice(roundStart, roundStart + 2)
      // No player should appear twice in the same round
      const playerIds = roundPairings.flatMap(p => [p.player1Id, p.player2Id])
      const uniqueIds = new Set(playerIds)
      expect(uniqueIds.size).toBe(playerIds.length)
    }
  })

  it('generates pairings in round order for even number of players', () => {
    // 6 players → 5 rounds of 3 matches each
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4'), makePlayer('p5'), makePlayer('p6')]
    const groups = [makeGroup('g1', 'Group A', players)]
    const result = generateRoundRobinPairings(groups)

    expect(result).toHaveLength(15) // C(6,2) = 15

    // 5 rounds of 3 matches: [0,1,2], [3,4,5], [6,7,8], [9,10,11], [12,13,14]
    for (let round = 0; round < 5; round++) {
      const roundStart = round * 3
      const roundPairings = result.slice(roundStart, roundStart + 3)
      const playerIds = roundPairings.flatMap(p => [p.player1Id, p.player2Id])
      const uniqueIds = new Set(playerIds)
      expect(uniqueIds.size).toBe(playerIds.length)
    }
  })

  it('interleaves rounds from multiple groups', () => {
    const groupA = makeGroup('gA', 'Group A', [makePlayer('a1'), makePlayer('a2'), makePlayer('a3')])
    const groupB = makeGroup('gB', 'Group B', [makePlayer('b1'), makePlayer('b2'), makePlayer('b3')])
    const result = generateRoundRobinPairings([groupA, groupB])

    // 3 pairings per group = 6 total
    expect(result).toHaveLength(6)

    // Interleaved by round: round 1 of A, round 1 of B, round 2 of A, ...
    expect(result[0].groupId).toBe('gA')
    expect(result[1].groupId).toBe('gB')
    expect(result[2].groupId).toBe('gA')
    expect(result[3].groupId).toBe('gB')
    expect(result[4].groupId).toBe('gA')
    expect(result[5].groupId).toBe('gB')
  })

  it('interleaves correctly when groups have different sizes', () => {
    const groupA = makeGroup('gA', 'Group A', [makePlayer('a1'), makePlayer('a2')]) // 1 round, 1 match
    const groupB = makeGroup('gB', 'Group B', [makePlayer('b1'), makePlayer('b2'), makePlayer('b3')]) // 3 rounds, 1 match each
    const result = generateRoundRobinPairings([groupA, groupB])

    expect(result).toHaveLength(4)
    // First round: one from A, one from B
    expect(result[0].groupId).toBe('gA')
    expect(result[1].groupId).toBe('gB')
    // A is exhausted, remaining rounds from B
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
// assignTimeSlotsForDates
// ---------------------------------------------------------------------------

describe('assignTimeSlotsForDates', () => {
  const timeSlots = ['18:00', '18:30', '19:00']
  const numberOfCourts = 2

  it('assigns a single match to the first available slot', () => {
    const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
    const { assignments: result } = assignTimeSlotsForDates(plans, timeSlots, numberOfCourts)

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
    const plans = [makeDatePlan('2026-03-01', [
      makePairing('g1', 'p1', 'p2'),
      makePairing('g1', 'p3', 'p4'),
    ])]
    const { assignments: result } = assignTimeSlotsForDates(plans, timeSlots, numberOfCourts)

    expect(result).toHaveLength(2)
    expect(result[0].matchTime).toBe('18:00')
    expect(result[1].matchTime).toBe('18:00')
    expect(result[0].courtNumber).toBe('Terrain 1')
    expect(result[1].courtNumber).toBe('Terrain 2')
  })

  it('respects court capacity (cannot exceed numberOfCourts per slot)', () => {
    const plans = [makeDatePlan('2026-03-01', [
      makePairing('g1', 'p1', 'p2'),
      makePairing('g1', 'p3', 'p4'),
      makePairing('g1', 'p5', 'p6'),
    ])]
    const { assignments: result } = assignTimeSlotsForDates(plans, timeSlots, numberOfCourts)

    expect(result).toHaveLength(3)
    const firstSlotMatches = result.filter((a) => a.matchTime === '18:00')
    const secondSlotMatches = result.filter((a) => a.matchTime === '18:30')
    expect(firstSlotMatches).toHaveLength(2)
    expect(secondSlotMatches).toHaveLength(1)
  })

  it('drops matches when there are more pairings than available slots', () => {
    const plans = [makeDatePlan('2026-03-01', [
      makePairing('g1', 'p1', 'p2'),
      makePairing('g1', 'p3', 'p4'),
      makePairing('g1', 'p5', 'p6'),
    ])]
    const { assignments: result } = assignTimeSlotsForDates(plans, ['18:00'], 2)

    expect(result).toHaveLength(2)
  })

  it('returns empty array when no plans provided', () => {
    const { assignments: result } = assignTimeSlotsForDates([], timeSlots, numberOfCourts)
    expect(result).toEqual([])
  })

  it('returns empty array when no time slots provided', () => {
    const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
    const { assignments: result } = assignTimeSlotsForDates(plans, [], numberOfCourts)
    expect(result).toEqual([])
  })

  // -------------------------------------------------------------------------
  // Player constraints
  // -------------------------------------------------------------------------

  describe('with player constraints', () => {
    it('skips slots before player arrival time', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '18:45', departure: '', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('19:00')
    })

    it('skips slots where match would end after player departure', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p2', { arrival: '', departure: '18:45', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('18:00')
    })

    it('flags absent players on their absence date (soft constraint)', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '', departure: '', unavailable: ['2026-03-01'] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchDate).toBe('2026-03-01')
      expect(result[0].absentPlayerIds).toContain('p1')
    })

    it('handles multiple constraints simultaneously', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '19:00', departure: '', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, ['18:00', '18:30', '19:00', '19:30'], numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('19:00')
    })

    it('assigns matches normally for players without constraints', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p3', { arrival: '22:00', departure: '', unavailable: ['2026-03-01'] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('18:00')
    })

    it('places match on absence date as last resort (soft constraint) with absentPlayerIds', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '', departure: '', unavailable: ['2026-03-01'] })
      constraints.set('p2', { arrival: '', departure: '', unavailable: ['2026-03-01'] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, timeSlots, numberOfCourts, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].absentPlayerIds).toContain('p1')
      expect(result[0].absentPlayerIds).toContain('p2')
    })
  })

  // -------------------------------------------------------------------------
  // Availability window intersection + fallback
  // -------------------------------------------------------------------------

  describe('availability window intersection and fallback', () => {
    const slots = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']

    it('places match at the latest arrival time when both players have different arrivals', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '19:00', departure: '', unavailable: [] })
      constraints.set('p2', { arrival: '20:00', departure: '', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, slots, 1, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('20:00')
    })

    it('places match before the earliest departure (match must finish before departure)', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '', departure: '22:00', unavailable: [] })
      constraints.set('p2', { arrival: '', departure: '21:00', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, slots, 1, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('18:00')
    })

    it('uses fallback when availability windows do not intersect', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '', departure: '20:00', unavailable: [] })
      constraints.set('p2', { arrival: '20:30', departure: '', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, slots, 1, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('20:30')
    })

    it('falls back to nearest slot when all slots in intersection window are taken', () => {
      const narrowSlots = ['19:00', '19:30', '20:00', '20:30', '21:00']
      const constraints = new Map<string, PlayerConstraints>()
      // p1/p2 have a tight window — they'll be scheduled first by sortByAvailabilityTightness
      constraints.set('p1', { arrival: '19:30', departure: '21:00', unavailable: [] })
      constraints.set('p2', { arrival: '19:30', departure: '21:00', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [
        makePairing('g1', 'p3', 'p4'),
        makePairing('g1', 'p5', 'p6'),
        makePairing('g1', 'p7', 'p8'),
        makePairing('g1', 'p1', 'p2'),
      ])]
      const { assignments: result } = assignTimeSlotsForDates(plans, narrowSlots, 1, constraints, 30)

      // p1/p2 are scheduled first (tightest window) → they get 19:30 (first in-window slot)
      const p1p2Match = result.find(a => a.player1Id === 'p1' && a.player2Id === 'p2')
      expect(p1p2Match).toBeDefined()
      expect(p1p2Match!.matchTime).toBe('19:30')
    })

    it('prefers slots inside the intersection window over closer free slots outside', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '20:00', departure: '', unavailable: [] })
      constraints.set('p2', { arrival: '', departure: '21:30', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [
        makePairing('g1', 'p3', 'p4'),
        makePairing('g1', 'p1', 'p2'),
      ])]
      const { assignments: result } = assignTimeSlotsForDates(plans, slots, 1, constraints, 30)

      const p1p2Match = result.find(a => a.player1Id === 'p1' && a.player2Id === 'p2')
      expect(p1p2Match).toBeDefined()
      expect(p1p2Match!.matchTime).toBe('20:00')
    })

    it('picks the closest slot to the window boundary when falling back', () => {
      const constraints = new Map<string, PlayerConstraints>()
      constraints.set('p1', { arrival: '', departure: '19:00', unavailable: [] })
      constraints.set('p2', { arrival: '20:00', departure: '', unavailable: [] })

      const plans = [makeDatePlan('2026-03-01', [makePairing('g1', 'p1', 'p2')])]
      const { assignments: result } = assignTimeSlotsForDates(plans, slots, 1, constraints, 30)

      expect(result).toHaveLength(1)
      expect(result[0].matchTime).toBe('20:00')
    })
  })

  // -------------------------------------------------------------------------
  // Round-robin integration: all matches placed with round → date mapping
  // -------------------------------------------------------------------------

  describe('round-robin integration', () => {
    it('places ALL matches for 5 players across 5 dates', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4'), makePlayer('p5')]
      const groups = [makeGroup('g1', 'Box 1', players)]
      const fiveDates = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']
      const slots = ['19:00', '19:30', '20:00']

      const groupRounds = generateGroupRounds(groups)
      const datePlans = mapRoundsToDates(groupRounds, fiveDates)
      const { assignments: result } = assignTimeSlotsForDates(datePlans, slots, 3, undefined, 30)

      expect(result).toHaveLength(10)
    })

    it('places ALL matches for 6 players across 5 dates', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4'), makePlayer('p5'), makePlayer('p6')]
      const groups = [makeGroup('g1', 'Box 1', players)]
      const fiveDates = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']
      const slots = ['19:00', '19:30', '20:00']

      const groupRounds = generateGroupRounds(groups)
      const datePlans = mapRoundsToDates(groupRounds, fiveDates)
      const { assignments: result } = assignTimeSlotsForDates(datePlans, slots, 3, undefined, 30)

      expect(result).toHaveLength(15)
    })

    it('places ALL matches for 5 players and aligns bye with absence date', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4'), makePlayer('p5')]
      const groups = [makeGroup('g1', 'Box 1', players)]
      const fiveDates = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']
      const slots = ['19:00', '19:30', '20:00']

      const absences = new Map<string, string[]>()
      absences.set('p3', ['2026-03-03'])

      const groupRounds = generateGroupRounds(groups, fiveDates, absences)
      const datePlans = mapRoundsToDates(groupRounds, fiveDates)
      const { assignments: result } = assignTimeSlotsForDates(datePlans, slots, 3, undefined, 30)

      expect(result).toHaveLength(10)

      const p3MatchesOnAbsence = result.filter(
        a => (a.player1Id === 'p3' || a.player2Id === 'p3') && a.matchDate === '2026-03-03'
      )
      expect(p3MatchesOnAbsence).toHaveLength(0)
    })

    it('aligns multiple byes with multiple absence dates', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4'), makePlayer('p5')]
      const groups = [makeGroup('g1', 'Box 1', players)]
      const fiveDates = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']
      const slots = ['19:00', '19:30', '20:00']

      const absences = new Map<string, string[]>()
      absences.set('p1', ['2026-03-01'])
      absences.set('p4', ['2026-03-04'])

      const groupRounds = generateGroupRounds(groups, fiveDates, absences)
      const datePlans = mapRoundsToDates(groupRounds, fiveDates)
      const { assignments: result } = assignTimeSlotsForDates(datePlans, slots, 3, undefined, 30)

      expect(result).toHaveLength(10)

      const p1MatchesOnAbsence = result.filter(
        a => (a.player1Id === 'p1' || a.player2Id === 'p1') && a.matchDate === '2026-03-01'
      )
      expect(p1MatchesOnAbsence).toHaveLength(0)

      const p4MatchesOnAbsence = result.filter(
        a => (a.player1Id === 'p4' || a.player2Id === 'p4') && a.matchDate === '2026-03-04'
      )
      expect(p4MatchesOnAbsence).toHaveLength(0)
    })

    it('does not change round order when no absences', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4'), makePlayer('p5')]
      const groups = [makeGroup('g1', 'Box 1', players)]
      const fiveDates = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']

      const withoutAbsences = generateRoundRobinPairings(groups)
      const withEmptyAbsences = generateRoundRobinPairings(groups, fiveDates, new Map())

      expect(withoutAbsences.map(p => `${p.player1Id}-${p.player2Id}`))
        .toEqual(withEmptyAbsences.map(p => `${p.player1Id}-${p.player2Id}`))
    })

    it('does not change round order for even groups (no bye)', () => {
      const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4'), makePlayer('p5'), makePlayer('p6')]
      const groups = [makeGroup('g1', 'Box 1', players)]
      const fiveDates = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']
      const absences = new Map<string, string[]>()
      absences.set('p3', ['2026-03-03'])

      const withoutAbsences = generateRoundRobinPairings(groups)
      const withAbsences = generateRoundRobinPairings(groups, fiveDates, absences)

      expect(withoutAbsences.map(p => `${p.player1Id}-${p.player2Id}`))
        .toEqual(withAbsences.map(p => `${p.player1Id}-${p.player2Id}`))
    })

    it('places ALL matches for 3 groups of 5 players across 5 dates', () => {
      const makeGroupOfFive = (gId: string, gName: string, prefix: string) =>
        makeGroup(gId, gName, [
          makePlayer(`${prefix}1`), makePlayer(`${prefix}2`), makePlayer(`${prefix}3`),
          makePlayer(`${prefix}4`), makePlayer(`${prefix}5`),
        ])

      const groups = [
        makeGroupOfFive('g1', 'Box 1', 'a'),
        makeGroupOfFive('g2', 'Box 2', 'b'),
        makeGroupOfFive('g3', 'Box 3', 'c'),
      ]
      const fiveDates = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']
      const slots = ['19:00', '19:30', '20:00', '20:30']

      const groupRounds = generateGroupRounds(groups)
      const datePlans = mapRoundsToDates(groupRounds, fiveDates)
      const { assignments: result } = assignTimeSlotsForDates(datePlans, slots, 3, undefined, 30)

      expect(result).toHaveLength(30)
    })
  })
})

// ---------------------------------------------------------------------------
// validateMatchSlot
// ---------------------------------------------------------------------------

describe('validateMatchSlot', () => {
  it('returns valid with no constraints', () => {
    const result = validateMatchSlot('p1', 'p2', '2026-03-01', '19:00', new Map(), 30)
    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('returns invalid when slot is before player arrival', () => {
    const constraints = new Map<string, PlayerConstraints>()
    constraints.set('p1', { arrival: '20:00', departure: '', unavailable: [] })

    const result = validateMatchSlot('p1', 'p2', '2026-03-01', '19:00', constraints, 30)
    expect(result.valid).toBe(false)
    expect(result.warnings.some(w => w.includes('p1'))).toBe(true)
  })

  it('returns invalid when match ends after player departure', () => {
    const constraints = new Map<string, PlayerConstraints>()
    constraints.set('p2', { arrival: '', departure: '19:15', unavailable: [] })

    const result = validateMatchSlot('p1', 'p2', '2026-03-01', '19:00', constraints, 30)
    expect(result.valid).toBe(false)
    expect(result.warnings.some(w => w.includes('p2'))).toBe(true)
  })

  it('returns valid when slot fits within departure (match ends exactly at departure)', () => {
    const constraints = new Map<string, PlayerConstraints>()
    constraints.set('p1', { arrival: '', departure: '19:30', unavailable: [] })

    const result = validateMatchSlot('p1', 'p2', '2026-03-01', '19:00', constraints, 30)
    expect(result.valid).toBe(true)
  })

  it('returns warning (not invalid) when a player is absent on that date', () => {
    const constraints = new Map<string, PlayerConstraints>()
    constraints.set('p1', { arrival: '', departure: '', unavailable: ['2026-03-01'] })

    const result = validateMatchSlot('p1', 'p2', '2026-03-01', '19:00', constraints, 30)
    // Absence is a soft constraint — valid but with warning
    expect(result.valid).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.some(w => w.includes('p1'))).toBe(true)
  })

  it('combines arrival and departure from both players', () => {
    const constraints = new Map<string, PlayerConstraints>()
    constraints.set('p1', { arrival: '19:00', departure: '', unavailable: [] })
    constraints.set('p2', { arrival: '', departure: '19:15', unavailable: [] })

    // p1 arrives at 19:00, p2 leaves at 19:15 → 30min match cannot fit
    const result = validateMatchSlot('p1', 'p2', '2026-03-01', '19:00', constraints, 30)
    expect(result.valid).toBe(false)
  })

  it('returns valid when both players available at time', () => {
    const constraints = new Map<string, PlayerConstraints>()
    constraints.set('p1', { arrival: '18:00', departure: '22:00', unavailable: [] })
    constraints.set('p2', { arrival: '18:30', departure: '21:00', unavailable: [] })

    const result = validateMatchSlot('p1', 'p2', '2026-03-01', '19:00', constraints, 30)
    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })
})

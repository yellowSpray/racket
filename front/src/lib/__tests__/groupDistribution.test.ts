import type { GroupPlayer, Group } from '@/types/draw'
import {
  distributePlayersByRanking,
  calculateGroupAverage,
  suggestGroupForPlayer,
} from '@/lib/groupDistribution'

function makePlayer(id: string, ranking: number): GroupPlayer {
  return {
    id,
    first_name: `Player`,
    last_name: id,
    phone: '0000',
    power_ranking: ranking,
  }
}

function makeGroup(
  id: string,
  name: string,
  players: GroupPlayer[],
  maxPlayers = 6,
): Group {
  return {
    id,
    event_id: 'evt-1',
    group_name: name,
    max_players: maxPlayers,
    created_at: '',
    players,
  }
}

describe('distributePlayersByRanking', () => {
  it('distributes players evenly into groups sorted by ranking (descending)', () => {
    const players = [
      makePlayer('1', 10),
      makePlayer('2', 30),
      makePlayer('3', 20),
      makePlayer('4', 40),
    ]
    const result = distributePlayersByRanking(players, 2)

    expect(result).toHaveLength(2)
    // top ranked (40, 30) in first group, lower (20, 10) in second
    expect(result[0].map((p) => p.id)).toEqual(['4', '2'])
    expect(result[1].map((p) => p.id)).toEqual(['3', '1'])
  })

  it('handles single group', () => {
    const players = [makePlayer('1', 5), makePlayer('2', 10)]
    const result = distributePlayersByRanking(players, 1)

    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(2)
  })

  it('handles empty players', () => {
    const result = distributePlayersByRanking([], 3)
    expect(result).toHaveLength(3)
    expect(result.every((g) => g.length === 0)).toBe(true)
  })

  it('handles uneven distribution (5 players in 2 groups)', () => {
    const players = [
      makePlayer('1', 10),
      makePlayer('2', 20),
      makePlayer('3', 30),
      makePlayer('4', 40),
      makePlayer('5', 50),
    ]
    const result = distributePlayersByRanking(players, 2)

    expect(result).toHaveLength(2)
    // all players should be distributed
    const total = result[0].length + result[1].length
    expect(total).toBe(5)
  })

  it('handles players with no ranking (defaults to 0)', () => {
    const players = [
      makePlayer('1', 0),
      makePlayer('2', 20),
      makePlayer('3', 0),
    ]
    const result = distributePlayersByRanking(players, 1)

    expect(result[0]).toHaveLength(3)
    // player with ranking 20 should be first
    expect(result[0][0].id).toBe('2')
  })
})

describe('calculateGroupAverage', () => {
  it('returns 0 for empty array', () => {
    expect(calculateGroupAverage([])).toBe(0)
  })

  it('calculates average for single player', () => {
    expect(calculateGroupAverage([makePlayer('1', 10)])).toBe(10)
  })

  it('calculates rounded average for multiple players', () => {
    const players = [
      makePlayer('1', 10),
      makePlayer('2', 20),
      makePlayer('3', 15),
    ]
    expect(calculateGroupAverage(players)).toBe(15)
  })

  it('treats non-numeric rankings as 0', () => {
    const players = [makePlayer('1', 0), makePlayer('2', 20)]
    expect(calculateGroupAverage(players)).toBe(10)
  })
})

describe('suggestGroupForPlayer', () => {
  it('returns null for empty groups', () => {
    expect(suggestGroupForPlayer(10, [])).toBeNull()
  })

  it('returns null when all groups are full', () => {
    const groups = [
      makeGroup(
        'g1',
        'Box 1',
        [makePlayer('1', 10), makePlayer('2', 20)],
        2, // max 2, currently 2
      ),
    ]
    expect(suggestGroupForPlayer(15, groups)).toBeNull()
  })

  it('suggests closest group by average ranking', () => {
    const groups = [
      makeGroup('g1', 'Box 1', [makePlayer('1', 10), makePlayer('2', 10)]),
      makeGroup('g2', 'Box 2', [makePlayer('3', 30), makePlayer('4', 30)]),
    ]
    // player ranking 28 is closer to Box 2 (avg 30) than Box 1 (avg 10)
    const result = suggestGroupForPlayer(28, groups)
    expect(result).not.toBeNull()
    expect(result!.groupId).toBe('g2')
    expect(result!.groupName).toBe('Box 2')
  })

  it('skips full groups and picks next closest', () => {
    const groups = [
      makeGroup(
        'g1',
        'Box 1',
        [makePlayer('1', '20'), makePlayer('2', 20)],
        2, // full
      ),
      makeGroup('g2', 'Box 2', [makePlayer('3', '10')]),
    ]
    const result = suggestGroupForPlayer(20, groups)
    expect(result).not.toBeNull()
    expect(result!.groupId).toBe('g2')
  })
})

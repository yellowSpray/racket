import { describe, it, expect } from 'vitest'
import {
  analyzeUnplaced,
  type SchedulerDiagnostic,
  type Suggestion,
} from '@/lib/schedulerSuggestions'
import type { UnplacedMatch } from '@/lib/matchScheduler'
import type { MatchPairing } from '@/types/match'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePairing(
  p1: string,
  p2: string,
  groupName = 'Box 1',
  groupId = 'g1',
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

function makeUnplaced(
  p1: string,
  p2: string,
  date: string,
  reason = 'Aucun creneau disponible',
  groupName = 'Box 1',
): UnplacedMatch {
  return {
    pairing: makePairing(p1, p2, groupName),
    date,
    reason,
  }
}

// ---------------------------------------------------------------------------
// analyzeUnplaced
// ---------------------------------------------------------------------------

describe('analyzeUnplaced', () => {
  it('returns empty diagnostic when no unplaced matches', () => {
    const result = analyzeUnplaced([], {
      totalMatches: 10,
      placedMatches: 10,
      dates: ['2026-03-01', '2026-03-02'],
      timeSlotsPerDay: 4,
      courts: 2,
    })

    expect(result.unplacedCount).toBe(0)
    expect(result.suggestions).toEqual([])
    expect(result.unplacedByDate).toEqual(new Map())
    expect(result.unplacedByGroup).toEqual(new Map())
  })

  it('groups unplaced matches by date', () => {
    const unplaced = [
      makeUnplaced('p1', 'p2', '2026-03-01'),
      makeUnplaced('p3', 'p4', '2026-03-01'),
      makeUnplaced('p5', 'p6', '2026-03-02'),
    ]

    const result = analyzeUnplaced(unplaced, {
      totalMatches: 10,
      placedMatches: 7,
      dates: ['2026-03-01', '2026-03-02'],
      timeSlotsPerDay: 4,
      courts: 2,
    })

    expect(result.unplacedByDate.get('2026-03-01')).toHaveLength(2)
    expect(result.unplacedByDate.get('2026-03-02')).toHaveLength(1)
  })

  it('groups unplaced matches by group', () => {
    const unplaced = [
      makeUnplaced('p1', 'p2', '2026-03-01', 'reason', 'Box 1'),
      makeUnplaced('p3', 'p4', '2026-03-01', 'reason', 'Box 2'),
      makeUnplaced('p5', 'p6', '2026-03-02', 'reason', 'Box 1'),
    ]

    const result = analyzeUnplaced(unplaced, {
      totalMatches: 10,
      placedMatches: 7,
      dates: ['2026-03-01', '2026-03-02'],
      timeSlotsPerDay: 4,
      courts: 2,
    })

    expect(result.unplacedByGroup.get('Box 1')).toHaveLength(2)
    expect(result.unplacedByGroup.get('Box 2')).toHaveLength(1)
  })

  it('suggests adding courts when slots are saturated', () => {
    // 2 dates * 2 slots * 1 court = 4 total slots, 4 placed, 2 unplaced
    const unplaced = [
      makeUnplaced('p1', 'p2', '2026-03-01'),
      makeUnplaced('p3', 'p4', '2026-03-02'),
    ]

    const result = analyzeUnplaced(unplaced, {
      totalMatches: 6,
      placedMatches: 4,
      dates: ['2026-03-01', '2026-03-02'],
      timeSlotsPerDay: 2,
      courts: 1,
    })

    const courtSuggestion = result.suggestions.find(s => s.type === 'add_courts')
    expect(courtSuggestion).toBeDefined()
    expect(courtSuggestion!.extra).toBeGreaterThan(0)
  })

  it('suggests adding dates when all dates are overloaded', () => {
    // 1 date * 2 slots * 2 courts = 4 slots, 4 placed, 2 unplaced
    const unplaced = [
      makeUnplaced('p1', 'p2', '2026-03-01'),
      makeUnplaced('p3', 'p4', '2026-03-01'),
    ]

    const result = analyzeUnplaced(unplaced, {
      totalMatches: 6,
      placedMatches: 4,
      dates: ['2026-03-01'],
      timeSlotsPerDay: 2,
      courts: 2,
    })

    const dateSuggestion = result.suggestions.find(s => s.type === 'add_dates')
    expect(dateSuggestion).toBeDefined()
    expect(dateSuggestion!.extra).toBeGreaterThan(0)
  })

  it('suggests expanding player availability when specific players appear multiple times', () => {
    const unplaced = [
      makeUnplaced('p1', 'p2', '2026-03-01'),
      makeUnplaced('p1', 'p3', '2026-03-02'),
      makeUnplaced('p1', 'p4', '2026-03-03'),
    ]

    const result = analyzeUnplaced(unplaced, {
      totalMatches: 15,
      placedMatches: 12,
      dates: ['2026-03-01', '2026-03-02', '2026-03-03'],
      timeSlotsPerDay: 4,
      courts: 2,
    })

    const playerSuggestion = result.suggestions.find(s => s.type === 'check_player')
    expect(playerSuggestion).toBeDefined()
    expect(playerSuggestion!.playerIds).toContain('p1')
  })

  it('returns correct unplacedCount', () => {
    const unplaced = [
      makeUnplaced('p1', 'p2', '2026-03-01'),
      makeUnplaced('p3', 'p4', '2026-03-01'),
    ]

    const result = analyzeUnplaced(unplaced, {
      totalMatches: 10,
      placedMatches: 8,
      dates: ['2026-03-01'],
      timeSlotsPerDay: 4,
      courts: 2,
    })

    expect(result.unplacedCount).toBe(2)
    expect(result.placedCount).toBe(8)
    expect(result.totalCount).toBe(10)
  })

  it('does not suggest courts when there are enough slots', () => {
    // 2 dates * 4 slots * 3 courts = 24 slots, way more than needed
    const unplaced = [
      makeUnplaced('p1', 'p2', '2026-03-01'),
    ]

    const result = analyzeUnplaced(unplaced, {
      totalMatches: 6,
      placedMatches: 5,
      dates: ['2026-03-01', '2026-03-02'],
      timeSlotsPerDay: 4,
      courts: 3,
    })

    // Should not suggest adding courts since there are plenty of slots
    // The issue is likely player constraints, not capacity
    const courtSuggestion = result.suggestions.find(s => s.type === 'add_courts')
    expect(courtSuggestion).toBeUndefined()
  })

  it('handles single unplaced match correctly', () => {
    const unplaced = [makeUnplaced('p1', 'p2', '2026-03-01')]

    const result = analyzeUnplaced(unplaced, {
      totalMatches: 10,
      placedMatches: 9,
      dates: ['2026-03-01', '2026-03-02'],
      timeSlotsPerDay: 4,
      courts: 2,
    })

    expect(result.unplacedCount).toBe(1)
    expect(result.unplacedDetails).toHaveLength(1)
    expect(result.unplacedDetails[0]).toMatchObject({
      player1Name: 'Player p1',
      player2Name: 'Player p2',
      date: '2026-03-01',
      groupName: 'Box 1',
    })
  })
})

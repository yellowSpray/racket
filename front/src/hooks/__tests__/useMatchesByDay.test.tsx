import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { MockQueryBuilder } from '@/test/mocks/supabase'

const { mockSupabase, groupsBuilder, matchesSelectBuilder, matchesUpdateBuilder } = vi.hoisted(() => {
    function makeBuild(): MockQueryBuilder {
        const qb = {} as MockQueryBuilder
        qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
        qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
        qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
        qb.maybeSingle = vi.fn(() => qb); qb.limit = vi.fn(() => qb)
        qb.lt = vi.fn(() => qb); qb.neq = vi.fn(() => qb); qb.not = vi.fn(() => qb)
        qb.is = vi.fn(() => qb); qb.gte = vi.fn(() => qb); qb.then = vi.fn()
        qb._resolve = (data: unknown) => {
            const p = Promise.resolve({ data, error: null })
            qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>
            return qb
        }
        qb._reject = (error: string) => {
            const p = Promise.resolve({ data: null, error: { message: error } })
            qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>
            return qb
        }
        return qb
    }

    const gb = makeBuild()
    const msb = makeBuild()
    const mub = makeBuild()
    const mock = { from: vi.fn(), rpc: vi.fn() }

    return { mockSupabase: mock, groupsBuilder: gb, matchesSelectBuilder: msb, matchesUpdateBuilder: mub }
})

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

import { useMatchesByDay } from '../useMatchesByDay'

let matchesCallCount = 0

beforeEach(() => {
    vi.clearAllMocks()
    matchesCallCount = 0
    mockSupabase.from = vi.fn((table: string) => {
        if (table === 'groups') return groupsBuilder
        matchesCallCount++
        return matchesCallCount === 1 ? matchesSelectBuilder : matchesUpdateBuilder
    })
})

const MATCH_BASE = {
    group_id: 'g1',
    player1_id: 'p1',
    player2_id: 'p2',
    match_date: '2026-04-18',
    match_time: '10:00:00',
    court_number: null,
    winner_id: null,
    score: null,
    pending_score_p1: null,
    pending_score_p2: null,
    player1: { id: 'p1', first_name: 'Alice', last_name: 'Martin' },
    player2: { id: 'p2', first_name: 'Bob', last_name: 'Dupont' },
    group: { id: 'g1', group_name: 'A', event_id: 'ev1' },
}

describe('useMatchesByDay', () => {
    it('returns empty state when eventId is null', () => {
        const { result } = renderHook(() => useMatchesByDay(null))
        expect(result.current.days).toEqual([])
        expect(result.current.loading).toBe(false)
        expect(result.current.initialDayIndex).toBe(0)
    })

    it('returns empty days when groups fetch returns empty', async () => {
        groupsBuilder._resolve([])
        const { result } = renderHook(() => useMatchesByDay('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toEqual([])
    })

    it('returns empty days on groups fetch error', async () => {
        groupsBuilder._reject('Groups error')
        const { result } = renderHook(() => useMatchesByDay('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toEqual([])
    })

    it('returns empty days on matches fetch error', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._reject('Matches error')
        const { result } = renderHook(() => useMatchesByDay('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toEqual([])
    })

    it('groups matches by match_date', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', match_date: '2026-04-18' },
            { ...MATCH_BASE, id: 'm2', match_date: '2026-04-19' },
            { ...MATCH_BASE, id: 'm3', match_date: '2026-04-19' },
        ])
        const { result } = renderHook(() => useMatchesByDay('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toHaveLength(2)
        expect(result.current.days[0].matches).toHaveLength(1)
        expect(result.current.days[1].matches).toHaveLength(2)
    })

    it('includes resolved matches (winner_id set) in results', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', winner_id: 'p1', score: '3-1' },
            { ...MATCH_BASE, id: 'm2', winner_id: null, score: null },
        ])
        const { result } = renderHook(() => useMatchesByDay('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days[0].matches).toHaveLength(2)
    })

    describe('match classification', () => {
        it('classifies match with winner_id as done', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', winner_id: 'p1', score: '3-1' },
            ])
            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            expect(result.current.days[0].matches[0].status).toBe('done')
        })

        it('classifies match with no pending scores as no_score', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', pending_score_p1: null, pending_score_p2: null },
            ])
            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            expect(result.current.days[0].matches[0].status).toBe('no_score')
        })

        it('classifies match with one pending score as waiting_one', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: null },
            ])
            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            expect(result.current.days[0].matches[0].status).toBe('waiting_one')
        })

        it('classifies match with two identical pending scores as waiting_one', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: '3-1' },
            ])
            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            expect(result.current.days[0].matches[0].status).toBe('waiting_one')
        })

        it('classifies match with conflicting pending scores as conflict', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: '2-3' },
            ])
            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            expect(result.current.days[0].matches[0].status).toBe('conflict')
        })
    })

    describe('initialDayIndex', () => {
        it('is 0 when no data', async () => {
            groupsBuilder._resolve([])
            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            expect(result.current.initialDayIndex).toBe(0)
        })

        it('points to today index when today has matches', async () => {
            const today = new Date().toISOString().slice(0, 10)
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', match_date: yesterday },
                { ...MATCH_BASE, id: 'm2', match_date: today },
            ])
            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            expect(result.current.initialDayIndex).toBe(1)
        })

        it('points to the next upcoming day when today has no matches', async () => {
            const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', match_date: yesterday },
                { ...MATCH_BASE, id: 'm2', match_date: tomorrow },
            ])
            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            // yesterday is index 0, tomorrow is index 1 — next upcoming is tomorrow = index 1
            expect(result.current.initialDayIndex).toBe(1)
        })
    })

    describe('resolveScore', () => {
        it('calls supabase update with correct fields and returns true', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            let success: boolean | undefined
            await act(async () => {
                success = await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            expect(success).toBe(true)
            expect(matchesUpdateBuilder.update).toHaveBeenCalledWith({
                score: '3-1',
                winner_id: 'p1',
                pending_score_p1: null,
                pending_score_p2: null,
                pending_at: null,
                pending_by: null,
            })
            expect(matchesUpdateBuilder.eq).toHaveBeenCalledWith('id', 'm1')
        })

        it('returns false on update error', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._reject('Update failed')

            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            let success: boolean | undefined
            await act(async () => {
                success = await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            expect(success).toBe(false)
        })

        it('optimistically marks the match as done (keeps it in state)', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            await act(async () => {
                await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            const match = result.current.days[0].matches[0]
            expect(match.status).toBe('done')
            expect(match.score).toBe('3-1')
        })

        it('keeps match unchanged on update error', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._reject('Update failed')

            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            await act(async () => {
                await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            expect(result.current.days[0].matches[0].status).toBe('no_score')
        })

        it('computes winner_id as p1 when score is 3-1', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            await act(async () => {
                await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            expect(matchesUpdateBuilder.update).toHaveBeenCalledWith(
                expect.objectContaining({ winner_id: 'p1' })
            )
        })

        it('computes winner_id as p2 when score is 1-3', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            await act(async () => {
                await result.current.resolveScore('m1', '1-3', 'p1', 'p2')
            })

            expect(matchesUpdateBuilder.update).toHaveBeenCalledWith(
                expect.objectContaining({ winner_id: 'p2' })
            )
        })

        it('computes winner_id as p2 for ABS-0 (p1 absent)', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            await act(async () => {
                await result.current.resolveScore('m1', 'ABS-0', 'p1', 'p2')
            })

            expect(matchesUpdateBuilder.update).toHaveBeenCalledWith(
                expect.objectContaining({ winner_id: 'p2' })
            )
        })

        it('computes winner_id as p1 for 0-ABS (p2 absent)', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => useMatchesByDay('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            await act(async () => {
                await result.current.resolveScore('m1', '0-ABS', 'p1', 'p2')
            })

            expect(matchesUpdateBuilder.update).toHaveBeenCalledWith(
                expect.objectContaining({ winner_id: 'p1' })
            )
        })
    })
})

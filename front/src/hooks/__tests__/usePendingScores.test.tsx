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
        qb.is = vi.fn(() => qb); qb.then = vi.fn()
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
    const mock = { from: vi.fn(), rpc: vi.fn(), _builder: msb }

    return { mockSupabase: mock, groupsBuilder: gb, matchesSelectBuilder: msb, matchesUpdateBuilder: mub }
})

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

import { usePendingScores } from '../usePendingScores'

let matchesCallCount = 0

beforeEach(() => {
    vi.clearAllMocks()
    matchesCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'groups') return groupsBuilder
        matchesCallCount++
        return matchesCallCount === 1 ? matchesSelectBuilder : matchesUpdateBuilder
    })
})

const MATCH_BASE = {
    group_id: 'g1',
    player1_id: 'p1',
    player2_id: 'p2',
    match_date: '2026-04-10',
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

describe('usePendingScores', () => {
    it('returns empty days and no loading when eventId is null', () => {
        const { result } = renderHook(() => usePendingScores(null))
        expect(result.current.days).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('returns empty days when groups fetch returns empty', async () => {
        groupsBuilder._resolve([])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toEqual([])
    })

    it('sets error and returns empty days on groups fetch error', async () => {
        groupsBuilder._reject('Groups error')
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toEqual([])
        expect(result.current.error).toBe('Groups error')
    })

    it('sets error and returns empty days on matches fetch error', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._reject('Matches error')
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toEqual([])
        expect(result.current.error).toBe('Matches error')
    })

    it('returns empty days when no unconfirmed matches', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toEqual([])
    })

    it('groups matches by match_date', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', match_date: '2026-04-10', match_time: '10:00:00' },
            { ...MATCH_BASE, id: 'm2', match_date: '2026-04-11', match_time: '11:00:00' },
            { ...MATCH_BASE, id: 'm3', match_date: '2026-04-11', match_time: '20:00:00' },
        ])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days).toHaveLength(2)
        expect(result.current.days[0].date).toBe('2026-04-10')
        expect(result.current.days[0].matches).toHaveLength(1)
        expect(result.current.days[1].date).toBe('2026-04-11')
        expect(result.current.days[1].matches).toHaveLength(2)
    })

    it('preserves order of matches within a day as returned by the query', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', match_date: '2026-04-10', match_time: '10:00:00' },
            { ...MATCH_BASE, id: 'm2', match_date: '2026-04-10', match_time: '20:00:00' },
        ])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days[0].matches[0].id).toBe('m1')
        expect(result.current.days[0].matches[1].id).toBe('m2')
    })

    it('classifies match with no pending scores as no_score', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', pending_score_p1: null, pending_score_p2: null },
        ])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days[0].matches[0].status).toBe('no_score')
    })

    it('classifies match with only p1 pending as waiting_one', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: null },
        ])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days[0].matches[0].status).toBe('waiting_one')
    })

    it('classifies match with only p2 pending as waiting_one', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', pending_score_p1: null, pending_score_p2: '1-3' },
        ])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days[0].matches[0].status).toBe('waiting_one')
    })

    it('classifies match with different pending scores as conflict', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: '2-3' },
        ])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days[0].matches[0].status).toBe('conflict')
    })

    it('classifies match with identical pending scores as waiting_one (not conflict)', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: '3-1' },
        ])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days[0].matches[0].status).toBe('waiting_one')
    })

    it('provides a formatted day label', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesSelectBuilder._resolve([
            { ...MATCH_BASE, id: 'm1', match_date: '2026-04-10' },
        ])
        const { result } = renderHook(() => usePendingScores('ev1'))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.days[0].label).toBeTruthy()
        expect(typeof result.current.days[0].label).toBe('string')
    })

    describe('resolveScore', () => {
        it('calls supabase update with correct fields and returns true', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: '2-3' },
            ])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => usePendingScores('ev1'))
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
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: '2-3' },
            ])
            matchesUpdateBuilder._reject('Update failed')

            const { result } = renderHook(() => usePendingScores('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            let success: boolean | undefined
            await act(async () => {
                success = await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            expect(success).toBe(false)
        })

        it('optimistically removes match from state on success', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: '2-3' },
            ])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => usePendingScores('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))
            expect(result.current.days).toHaveLength(1)

            await act(async () => {
                await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            expect(result.current.days).toHaveLength(0)
        })

        it('keeps match in state when update fails', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([
                { ...MATCH_BASE, id: 'm1', pending_score_p1: '3-1', pending_score_p2: '2-3' },
            ])
            matchesUpdateBuilder._reject('Update failed')

            const { result } = renderHook(() => usePendingScores('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            await act(async () => {
                await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            expect(result.current.days[0].matches).toHaveLength(1)
        })

        it('computes winner_id as p1 when p1 wins (e.g. 3-1)', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => usePendingScores('ev1'))
            await waitFor(() => expect(result.current.loading).toBe(false))

            await act(async () => {
                await result.current.resolveScore('m1', '3-1', 'p1', 'p2')
            })

            expect(matchesUpdateBuilder.update).toHaveBeenCalledWith(
                expect.objectContaining({ winner_id: 'p1' })
            )
        })

        it('computes winner_id as p2 when p2 wins (e.g. 1-3)', async () => {
            groupsBuilder._resolve([{ id: 'g1' }])
            matchesSelectBuilder._resolve([{ ...MATCH_BASE, id: 'm1' }])
            matchesUpdateBuilder._resolve(null)

            const { result } = renderHook(() => usePendingScores('ev1'))
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

            const { result } = renderHook(() => usePendingScores('ev1'))
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

            const { result } = renderHook(() => usePendingScores('ev1'))
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

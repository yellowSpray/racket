import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

// We need two separate builders because the hook chains two sequential queries
// (groups then matches). Each `from()` call returns a fresh builder.
const { mockSupabase, groupsBuilder, matchesBuilder } = vi.hoisted(() => {
    function makeBuild(): MockQueryBuilder {
        const qb = {} as MockQueryBuilder
        qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
        qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
        qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
        qb.maybeSingle = vi.fn(() => qb); qb.limit = vi.fn(() => qb)
        qb.lt = vi.fn(() => qb); qb.neq = vi.fn(() => qb); qb.not = vi.fn(() => qb)
        qb.is = vi.fn(() => qb); qb.gte = vi.fn(() => qb); qb.then = vi.fn()
        qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
        qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
        return qb
    }

    const gb = makeBuild()
    const mb = makeBuild()

    const mock = {
        from: vi.fn((table: string) => table === 'groups' ? gb : mb),
        rpc: vi.fn(),
        _builder: gb,
    } as unknown as MockSupabase

    return { mockSupabase: mock, groupsBuilder: gb, matchesBuilder: mb }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { useTodayMatches } from '../useTodayMatches'

describe('useTodayMatches', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Re-wire from to return the right builder
        mockSupabase.from = vi.fn((table: string) => table === 'groups' ? groupsBuilder : matchesBuilder) as MockSupabase['from']
    })

    it('should return empty state when eventId is null', () => {
        const { result } = renderHook(() => useTodayMatches(null))

        expect(result.current.matches).toEqual([])
        expect(result.current.matchDate).toBeNull()
        expect(result.current.loading).toBe(false)
        expect(result.current.isToday).toBe(false)
    })

    it('should fetch today matches for given event', async () => {
        const groups = [{ id: 'g1' }, { id: 'g2' }]
        const todayMatches = [
            {
                id: 'm1', group_id: 'g1', player1_id: 'p1', player2_id: 'p2',
                match_date: '2026-03-08', match_time: '19:00:00+00',
                court_number: '1', winner_id: null, score: null,
                player1: { id: 'p1', first_name: 'Alice', last_name: 'Martin' },
                player2: { id: 'p2', first_name: 'Bob', last_name: 'Dupont' },
                group: { id: 'g1', group_name: 'Box A', event_id: 'e1' },
            },
        ]

        groupsBuilder._resolve(groups)
        matchesBuilder._resolve(todayMatches)

        const { result } = renderHook(() => useTodayMatches('e1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.matches).toEqual(todayMatches)
        expect(mockSupabase.from).toHaveBeenCalledWith('groups')
        expect(mockSupabase.from).toHaveBeenCalledWith('matches')
    })

    it('should set loading during fetch', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesBuilder._resolve([])

        const { result } = renderHook(() => useTodayMatches('e1'))

        // Eventually loading becomes false
        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })
    })

    it('should return empty matches when no groups exist', async () => {
        groupsBuilder._resolve([])

        const { result } = renderHook(() => useTodayMatches('e1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.matches).toEqual([])
        expect(result.current.matchDate).toBeNull()
    })

    it('should handle supabase error on groups fetch', async () => {
        groupsBuilder._reject('Groups fetch failed')

        const { result } = renderHook(() => useTodayMatches('e1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.matches).toEqual([])
    })

    it('should handle supabase error on matches fetch', async () => {
        groupsBuilder._resolve([{ id: 'g1' }])
        matchesBuilder._reject('Matches fetch failed')

        const { result } = renderHook(() => useTodayMatches('e1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.matches).toEqual([])
    })
})

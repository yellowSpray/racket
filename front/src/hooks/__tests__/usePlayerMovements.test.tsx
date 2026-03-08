import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

// We need 3 builders: events (prev event lookup), event_players (current + previous)
const { mockSupabase, eventsBuilder, eventPlayersBuilder } = vi.hoisted(() => {
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

    const eb = makeBuild()
    const epb = makeBuild()

    const mock = {
        from: vi.fn((table: string) => table === 'events' ? eb : epb),
        rpc: vi.fn(),
        _builder: eb,
    } as unknown as MockSupabase

    return { mockSupabase: mock, eventsBuilder: eb, eventPlayersBuilder: epb }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { usePlayerMovements } from '../usePlayerMovements'

describe('usePlayerMovements', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSupabase.from = vi.fn((table: string) =>
            table === 'events' ? eventsBuilder : eventPlayersBuilder
        ) as MockSupabase['from']
    })

    it('should return empty state when eventId is null', () => {
        const { result } = renderHook(() => usePlayerMovements(null, null))

        expect(result.current.movements).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('should return empty state when clubId is null', () => {
        const { result } = renderHook(() => usePlayerMovements('e1', null))

        expect(result.current.movements).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('should show new players as active when no previous event', async () => {
        // No previous event
        eventsBuilder._resolve(null)
        // Current event players
        eventPlayersBuilder._resolve([
            {
                profile_id: 'p1',
                registered_at: '2026-03-01T10:00:00Z',
                profiles: { id: 'p1', first_name: 'Alice', last_name: 'Martin' },
            },
        ])

        const { result } = renderHook(() => usePlayerMovements('e2', 'club1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.movements).toEqual([
            {
                profileId: 'p1',
                firstName: 'Alice',
                lastName: 'Martin',
                status: 'active',
                updatedAt: '2026-03-01T10:00:00Z',
            },
        ])
    })

    it('should compute diff between current and previous event players', async () => {
        // Previous event found
        eventsBuilder._resolve({ id: 'e1' })

        // Mock from() returns different data per sequential call for event_players
        let callCount = 0
        mockSupabase.from = vi.fn((table: string) => {
            if (table === 'events') return eventsBuilder
            callCount++
            if (callCount === 1) {
                // Current event players
                const qb = makeFreshBuilder()
                qb._resolve([
                    { profile_id: 'p1', registered_at: '2026-03-01T10:00:00Z', profiles: { id: 'p1', first_name: 'Alice', last_name: 'Martin' } },
                    { profile_id: 'p3', registered_at: '2026-03-01T12:00:00Z', profiles: { id: 'p3', first_name: 'Claire', last_name: 'Roy' } },
                ])
                return qb
            }
            // Previous event players
            const qb2 = makeFreshBuilder()
            qb2._resolve([
                { profile_id: 'p1', registered_at: '2026-02-01T10:00:00Z', profiles: { id: 'p1', first_name: 'Alice', last_name: 'Martin' } },
                { profile_id: 'p2', registered_at: '2026-02-01T11:00:00Z', profiles: { id: 'p2', first_name: 'Bob', last_name: 'Dupont' } },
            ])
            return qb2
        }) as MockSupabase['from']

        const { result } = renderHook(() => usePlayerMovements('e2', 'club1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        // Claire is new (active), Bob left (inactive), Alice is unchanged (not shown)
        expect(result.current.movements).toEqual([
            { profileId: 'p3', firstName: 'Claire', lastName: 'Roy', status: 'active', updatedAt: '2026-03-01T12:00:00Z' },
            { profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', status: 'inactive', updatedAt: '2026-02-01T11:00:00Z' },
        ])
    })

    it('should return empty on events fetch error', async () => {
        eventsBuilder._reject('Events fetch failed')

        const { result } = renderHook(() => usePlayerMovements('e2', 'club1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.movements).toEqual([])
    })

    it('should return empty on current players fetch error', async () => {
        eventsBuilder._resolve({ id: 'e1' })
        eventPlayersBuilder._reject('Players fetch failed')

        const { result } = renderHook(() => usePlayerMovements('e2', 'club1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.movements).toEqual([])
    })
})

// Helper to create fresh builders inside test closures
function makeFreshBuilder(): MockQueryBuilder {
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

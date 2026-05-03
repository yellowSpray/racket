import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase, paymentsBuilder } = vi.hoisted(() => {
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

    const pb = makeBuild()

    const mock = {
        from: vi.fn(() => pb),
        rpc: vi.fn(),
        _builder: pb,
    } as unknown as MockSupabase

    return { mockSupabase: mock, paymentsBuilder: pb }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { useUnpaidPayments } from '../useUnpaidPayments'

describe('useUnpaidPayments', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSupabase.from = vi.fn(() => paymentsBuilder) as MockSupabase['from']
    })

    it('should return empty state when clubId is null', () => {
        const { result } = renderHook(() => useUnpaidPayments(null, null))

        expect(result.current.payments).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('should return empty state when eventId is null', () => {
        const { result } = renderHook(() => useUnpaidPayments('club1', null))

        expect(result.current.payments).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('should return unpaid payments with player and event names', async () => {
        paymentsBuilder._resolve([
            {
                id: 'pay1',
                profile_id: 'p1',
                profiles: { first_name: 'Alice', last_name: 'Martin' },
                events: { event_name: 'Série 4' },
            },
            {
                id: 'pay2',
                profile_id: 'p2',
                profiles: { first_name: 'Bob', last_name: 'Dupont' },
                events: { event_name: 'Série 4' },
            },
        ])

        const { result } = renderHook(() => useUnpaidPayments('club1', 'event1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.payments).toEqual([
            { id: 'pay1', profileId: 'p1', firstName: 'Alice', lastName: 'Martin', eventName: 'Série 4' },
            { id: 'pay2', profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', eventName: 'Série 4' },
        ])
    })

    it('should return empty on fetch error', async () => {
        paymentsBuilder._reject('Fetch failed')

        const { result } = renderHook(() => useUnpaidPayments('club1', 'event1'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.payments).toEqual([])
    })

    it('should query payments table with correct filters', async () => {
        paymentsBuilder._resolve([])

        renderHook(() => useUnpaidPayments('club1', 'event1'))

        await waitFor(() => {
            expect(mockSupabase.from).toHaveBeenCalledWith('payments')
        })

        expect(paymentsBuilder.select).toHaveBeenCalled()
        expect(paymentsBuilder.eq).toHaveBeenCalledWith('status', 'unpaid')
        expect(paymentsBuilder.eq).toHaveBeenCalledWith('events.club_id', 'club1')
        expect(paymentsBuilder.eq).toHaveBeenCalledWith('event_id', 'event1')
    })
})

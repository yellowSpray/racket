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

/** Ligne telle que la renvoie la jointure payments > event_rounds > events. */
function row(id: string, profileId: string, first: string, last: string, roundNumber: number, eventName = 'Mixed') {
    return {
        id,
        profile_id: profileId,
        profiles: { first_name: first, last_name: last },
        event_rounds: { round_number: roundNumber, events: { event_name: eventName } },
    }
}

describe('useUnpaidPayments', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSupabase.from = vi.fn(() => paymentsBuilder) as MockSupabase['from']
    })

    it('rend un etat vide sans club', () => {
        const { result } = renderHook(() => useUnpaidPayments(null))

        expect(result.current.payments).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('remonte la serie et son evenement', async () => {
        paymentsBuilder._resolve([
            row('pay1', 'p1', 'Alice', 'Martin', 4),
            row('pay2', 'p2', 'Bob', 'Dupont', 5, 'Test'),
        ])

        const { result } = renderHook(() => useUnpaidPayments('club1'))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.payments).toEqual([
            { id: 'pay1', profileId: 'p1', firstName: 'Alice', lastName: 'Martin', roundNumber: 4, eventName: 'Mixed' },
            { id: 'pay2', profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', roundNumber: 5, eventName: 'Test' },
        ])
    })

    it('passe par event_rounds pour atteindre le club', async () => {
        // `payments` ne porte pas de colonne event_id : le lien vers l'evenement,
        // et donc vers le club, passe par la serie. Filtrer sur `events.club_id`
        // echouait, et le hook avalait l'erreur en affichant une carte vide.
        paymentsBuilder._resolve([])

        renderHook(() => useUnpaidPayments('club1'))

        await waitFor(() => expect(mockSupabase.from).toHaveBeenCalledWith('payments'))

        expect(paymentsBuilder.eq).toHaveBeenCalledWith('status', 'unpaid')
        expect(paymentsBuilder.eq).toHaveBeenCalledWith('event_rounds.events.club_id', 'club1')

        const selection = (paymentsBuilder.select as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
        expect(selection).toContain('event_rounds!inner')
        expect(selection).toContain('events!inner')
    })

    it('regroupe par joueur, du plus endette au moins endette', async () => {
        paymentsBuilder._resolve([
            row('pay1', 'p1', 'Alice', 'Martin', 3),
            row('pay2', 'p2', 'Bob', 'Dupont', 4),
            row('pay3', 'p1', 'Alice', 'Martin', 4),
        ])

        const { result } = renderHook(() => useUnpaidPayments('club1'))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.grouped).toHaveLength(2)
        expect(result.current.grouped[0].firstName).toBe('Alice')
        expect(result.current.grouped[0].count).toBe(2)
        expect(result.current.grouped[0].rounds.map(r => r.roundNumber)).toEqual([3, 4])
        expect(result.current.grouped[1].count).toBe(1)
    })

    it('ignore une ligne dont la serie ne se resout pas', async () => {
        // Serie supprimee : la ligne existe encore mais n'est plus rattachable.
        paymentsBuilder._resolve([
            row('pay1', 'p1', 'Alice', 'Martin', 3),
            { id: 'pay2', profile_id: 'p2', profiles: { first_name: 'Bob', last_name: 'Dupont' }, event_rounds: null },
        ])

        const { result } = renderHook(() => useUnpaidPayments('club1'))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.payments).toHaveLength(1)
    })

    it('rend un etat vide en cas d\'erreur', async () => {
        paymentsBuilder._reject('Fetch failed')

        const { result } = renderHook(() => useUnpaidPayments('club1'))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.payments).toEqual([])
    })
})

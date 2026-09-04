import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.limit = vi.fn(() => qb); qb.lt = vi.fn(() => qb)
    qb.neq = vi.fn(() => qb); qb.not = vi.fn(() => qb); qb.is = vi.fn(() => qb)
    qb.or = vi.fn(() => qb)
    qb.then = vi.fn()
    qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    return { mockSupabase: { from: vi.fn((_t?: string) => qb), _builder: qb } as MockSupabase }
})

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

import { useHeadToHead } from '../useHeadToHead'

const rows = [
    {
        id: 'm2', group_id: 'g2', player1_id: 'a', player2_id: 'b',
        match_date: '2026-05-10', match_time: '19:00', court_number: '1',
        winner_id: 'a', score: '3-1',
        group: { id: 'g2', group_name: 'Box 2', round_id: 'r2', event_rounds: { round_number: 2, event_id: 'e1', events: { event_name: 'Interclub' } } },
    },
    {
        id: 'm1', group_id: 'g1', player1_id: 'b', player2_id: 'a',
        match_date: '2026-03-02', match_time: '20:00', court_number: '2',
        winner_id: 'b', score: '3-2',
        group: { id: 'g1', group_name: 'Box 3', round_id: 'r1', event_rounds: { round_number: 1, event_id: 'e1', events: { event_name: 'Interclub' } } },
    },
]

describe('useHeadToHead', () => {
    beforeEach(() => vi.clearAllMocks())

    it('demarre vide', () => {
        const { result } = renderHook(() => useHeadToHead())
        expect(result.current.matches).toEqual([])
        expect(result.current.summary).toEqual({ played: 0, wins: 0, losses: 0 })
    })

    it('recupere les confrontations dans les deux sens', async () => {
        mockSupabase._builder._resolve(rows)
        const { result } = renderHook(() => useHeadToHead())

        await act(async () => { await result.current.fetchHistory('a', 'b') })

        expect(mockSupabase.from).toHaveBeenCalledWith('matches')
        // Un `or` couvre les deux ordres possibles de joueurs
        const orArg = mockSupabase._builder.or.mock.calls[0][0] as string
        expect(orArg).toContain('player1_id.eq.a')
        expect(orArg).toContain('player2_id.eq.a')
        expect(result.current.matches).toHaveLength(2)
    })

    it('calcule le bilan du point de vue du premier joueur', async () => {
        mockSupabase._builder._resolve(rows)
        const { result } = renderHook(() => useHeadToHead())

        await act(async () => { await result.current.fetchHistory('a', 'b') })

        expect(result.current.summary).toEqual({ played: 2, wins: 1, losses: 1 })
    })

    it('exclut le match en cours de l\'historique', async () => {
        mockSupabase._builder._resolve(rows)
        const { result } = renderHook(() => useHeadToHead())

        await act(async () => { await result.current.fetchHistory('a', 'b', 'm2') })

        expect(result.current.matches.map(m => m.id)).toEqual(['m1'])
        expect(result.current.summary).toEqual({ played: 1, wins: 0, losses: 1 })
    })

    it('ne fait aucun appel si un joueur manque', async () => {
        const { result } = renderHook(() => useHeadToHead())

        await act(async () => { await result.current.fetchHistory('a', null) })

        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('vide l\'historique en cas d\'erreur', async () => {
        mockSupabase._builder._reject('boom')
        const { result } = renderHook(() => useHeadToHead())

        await act(async () => { await result.current.fetchHistory('a', 'b') })

        expect(result.current.matches).toEqual([])
    })
})

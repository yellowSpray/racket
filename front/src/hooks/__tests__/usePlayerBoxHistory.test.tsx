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
    qb.or = vi.fn(() => qb); qb.then = vi.fn()
    qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    return { mockSupabase: { from: vi.fn((_t?: string) => qb), _builder: qb } as MockSupabase }
})

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

import { usePlayerBoxHistory } from '../usePlayerBoxHistory'

const rows = [
    {
        groups: {
            group_name: 'Box 5',
            event_rounds: {
                round_number: 1, start_date: '2026-06-01',
                events: { event_name: 'Interclub' },
            },
        },
    },
    {
        groups: {
            group_name: 'Box 3',
            event_rounds: {
                round_number: 2, start_date: '2026-07-01',
                events: { event_name: 'Interclub' },
            },
        },
    },
]

describe('usePlayerBoxHistory', () => {
    beforeEach(() => vi.clearAllMocks())

    it('demarre vide', () => {
        const { result } = renderHook(() => usePlayerBoxHistory())
        expect(result.current.history).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('recupere les passages du joueur', async () => {
        mockSupabase._builder._resolve(rows)
        const { result } = renderHook(() => usePlayerBoxHistory())

        await act(async () => { await result.current.fetchHistory('p1') })

        expect(mockSupabase.from).toHaveBeenCalledWith('group_players')
        expect(mockSupabase._builder.eq).toHaveBeenCalledWith('profile_id', 'p1')
        expect(result.current.history).toHaveLength(2)
    })

    it('deduit le mouvement entre les series', async () => {
        mockSupabase._builder._resolve(rows)
        const { result } = renderHook(() => usePlayerBoxHistory())

        await act(async () => { await result.current.fetchHistory('p1') })

        expect(result.current.history.map(h => h.movement)).toEqual(['first', 'up'])
    })

    it('ignore une ligne sans serie rattachee', async () => {
        // Une inscription orpheline ne doit pas faire planter l'affichage.
        mockSupabase._builder._resolve([...rows, { groups: null }])
        const { result } = renderHook(() => usePlayerBoxHistory())

        await act(async () => { await result.current.fetchHistory('p1') })

        expect(result.current.history).toHaveLength(2)
    })

    it('ne fait aucun appel sans joueur', async () => {
        const { result } = renderHook(() => usePlayerBoxHistory())

        await act(async () => { await result.current.fetchHistory(null) })

        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('vide le parcours en cas d\'erreur', async () => {
        mockSupabase._builder._reject('boom')
        const { result } = renderHook(() => usePlayerBoxHistory())

        await act(async () => { await result.current.fetchHistory('p1') })

        expect(result.current.history).toEqual([])
    })
})

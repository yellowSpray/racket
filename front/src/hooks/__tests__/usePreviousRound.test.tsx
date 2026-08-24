import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.limit = vi.fn(() => qb); qb.lt = vi.fn(() => qb)
    qb.neq = vi.fn(() => qb); qb.then = vi.fn()
    qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    return { mockSupabase: { from: vi.fn((_table?: string) => qb), _builder: qb } as MockSupabase }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { usePreviousRound } from '../usePreviousRound'

const roundsData = [
    { id: 'r1', event_id: 'e1', round_number: 1, start_date: '2026-01-01', end_date: '2026-01-28', number_of_courts: 2, status: 'completed' },
    { id: 'r2', event_id: 'e1', round_number: 2, start_date: '2026-02-01', end_date: '2026-02-28', number_of_courts: 2, status: 'completed' },
]

const groupsData = [
    {
        id: 'g1', round_id: 'r2', group_name: 'Box 1', max_players: 4, created_at: '',
        group_players: [
            { profile_id: 'p1', profiles: { id: 'p1', first_name: 'Alice', last_name: 'A', phone: '01', power_ranking: 10 } },
        ],
    },
]

const matchesData = [
    {
        id: 'm1', group_id: 'g1', player1_id: 'p1', player2_id: 'p2',
        match_date: '2026-02-07', match_time: '18:00', court_number: '1',
        winner_id: 'p1', score: '3-1',
        player1: { id: 'p1', first_name: 'Alice', last_name: 'A' },
        player2: { id: 'p2', first_name: 'Bob', last_name: 'B' },
        group: { id: 'g1', group_name: 'Box 1', round_id: 'r2' },
    },
]

/**
 * Les trois requetes (series, tableaux, matchs) partagent le meme builder mocke :
 * on fait donc repondre `then` differemment a chaque appel successif.
 */
function mockSequence(...datasets: unknown[]) {
    const qb = mockSupabase._builder
    let call = 0
    qb.then = vi.fn((onFulfilled: (v: unknown) => unknown) => {
        const data = datasets[Math.min(call, datasets.length - 1)]
        call += 1
        return Promise.resolve({ data, error: null }).then(onFulfilled)
    }) as unknown as MockQueryBuilder['then']
}

describe('usePreviousRound', () => {
    beforeEach(() => vi.clearAllMocks())

    it('demarre vide', () => {
        const { result } = renderHook(() => usePreviousRound())
        expect(result.current.previousRound).toBeNull()
        expect(result.current.previousGroups).toEqual([])
        expect(result.current.previousMatches).toEqual([])
    })

    it('retient la serie qui precede immediatement, dans le meme evenement', async () => {
        mockSequence(roundsData, groupsData, matchesData)
        const { result } = renderHook(() => usePreviousRound())

        await act(async () => {
            await result.current.fetchPreviousRound('e1', 3)
        })

        // La serie 2 precede la serie 3 — pas la serie 1
        expect(result.current.previousRound?.id).toBe('r2')
        expect(mockSupabase.from).toHaveBeenCalledWith('event_rounds')
    })

    it('ignore les series posterieures a la serie courante', async () => {
        mockSequence(roundsData, groupsData, matchesData)
        const { result } = renderHook(() => usePreviousRound())

        await act(async () => {
            await result.current.fetchPreviousRound('e1', 2)
        })

        expect(result.current.previousRound?.id).toBe('r1')
    })

    it('ne renvoie aucune serie precedente pour la premiere serie', async () => {
        mockSequence(roundsData, groupsData, matchesData)
        const { result } = renderHook(() => usePreviousRound())

        await act(async () => {
            await result.current.fetchPreviousRound('e1', 1)
        })

        expect(result.current.previousRound).toBeNull()
        expect(result.current.previousGroups).toEqual([])
    })

    it('charge les tableaux puis les matchs de la serie precedente', async () => {
        mockSequence(roundsData, groupsData, matchesData)
        const { result } = renderHook(() => usePreviousRound())

        await act(async () => {
            await result.current.fetchPreviousRound('e1', 3)
        })

        expect(result.current.previousGroups).toHaveLength(1)
        expect(result.current.previousGroups[0].group_name).toBe('Box 1')
        expect(result.current.previousMatches).toHaveLength(1)
    })

    it('ne fait aucun appel sans identifiant d\'evenement', async () => {
        const { result } = renderHook(() => usePreviousRound())

        await act(async () => {
            await result.current.fetchPreviousRound(null, 2)
        })

        expect(mockSupabase.from).not.toHaveBeenCalled()
        expect(result.current.previousRound).toBeNull()
    })
})

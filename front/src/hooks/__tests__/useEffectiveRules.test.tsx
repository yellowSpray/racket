import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

/**
 * Quatre tables sont interrogees : les regles de l'evenement et celles du
 * club, pour le bareme et pour les montees. Chaque appel a `from` rend un
 * builder neuf resolu avec la reponse enregistree pour cette table.
 */
const { mockSupabase, responses } = vi.hoisted(() => {
    const responses: Record<string, unknown> = {}

    function makeBuild(data: unknown): MockQueryBuilder {
        const qb = {} as MockQueryBuilder
        qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
        qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
        qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
        qb.limit = vi.fn(() => qb); qb.lt = vi.fn(() => qb); qb.neq = vi.fn(() => qb)
        qb.not = vi.fn(() => qb); qb.is = vi.fn(() => qb); qb.gte = vi.fn(() => qb)
        qb.or = vi.fn(() => qb); qb.then = vi.fn()
        qb.maybeSingle = vi.fn(() => qb)
        qb._resolve = (d: unknown) => { const p = Promise.resolve({ data: d, error: null }); qb.then = p.then.bind(p); return qb }
        qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p); return qb }
        return qb._resolve(data)
    }

    const mock = {
        from: vi.fn((table: string) => makeBuild(responses[table] ?? null)),
        rpc: vi.fn(),
        _builder: makeBuild(null),
    } as unknown as MockSupabase

    return { mockSupabase: mock, responses }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { useEffectiveRules } from '../useEffectiveRules'
import { DEFAULT_SCORE_POINTS } from '@/lib/effectiveRules'

const EVENT_ID = 'e-1'
const CLUB_ID = 'c-1'

const CLUB_POINTS = [
    { score: '3-0', winner_points: 5, loser_points: 0 },
    { score: '3-1', winner_points: 4, loser_points: 1 },
]
const EVENT_POINTS = [
    { score: '3-0', winner_points: 10, loser_points: 0 },
    { score: '3-1', winner_points: 8, loser_points: 2 },
]

function setup(rows: Record<string, unknown>) {
    for (const k of Object.keys(responses)) delete responses[k]
    Object.assign(responses, rows)
}

describe('useEffectiveRules', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        setup({})
    })

    it('rend les valeurs par defaut sans evenement ni club', async () => {
        const { result } = renderHook(() => useEffectiveRules(null, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.scoring.score_points).toEqual(DEFAULT_SCORE_POINTS)
        expect(result.current.scoring.origin).toBe('default')
        expect(result.current.promotion.origin).toBe('default')
        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('fait gagner les regles de l evenement sur celles du club', async () => {
        setup({
            event_scoring_rules: { event_id: EVENT_ID, score_points: EVENT_POINTS },
            event_promotion_rules: { event_id: EVENT_ID, promoted_count: 2, relegated_count: 3 },
            scoring_rules: { club_id: CLUB_ID, score_points: CLUB_POINTS },
            promotion_rules: { club_id: CLUB_ID, promoted_count: 1, relegated_count: 1 },
        })

        const { result } = renderHook(() => useEffectiveRules(EVENT_ID, CLUB_ID))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.scoring.score_points).toEqual(EVENT_POINTS)
        expect(result.current.scoring.origin).toBe('event')
        expect(result.current.promotion.promoted_count).toBe(2)
        expect(result.current.promotion.origin).toBe('event')
    })

    it('retombe sur le club quand l evenement ne porte aucune regle', async () => {
        setup({
            scoring_rules: { club_id: CLUB_ID, score_points: CLUB_POINTS },
            promotion_rules: { club_id: CLUB_ID, promoted_count: 2, relegated_count: 2 },
        })

        const { result } = renderHook(() => useEffectiveRules(EVENT_ID, CLUB_ID))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.scoring.score_points).toEqual(CLUB_POINTS)
        expect(result.current.scoring.origin).toBe('club')
        expect(result.current.promotion.relegated_count).toBe(2)
        expect(result.current.promotion.origin).toBe('club')
    })

    it('resout chaque table de son cote', async () => {
        // Bareme porte par l'evenement, montees heritees du club.
        setup({
            event_scoring_rules: { event_id: EVENT_ID, score_points: EVENT_POINTS },
            scoring_rules: { club_id: CLUB_ID, score_points: CLUB_POINTS },
            promotion_rules: { club_id: CLUB_ID, promoted_count: 2, relegated_count: 2 },
        })

        const { result } = renderHook(() => useEffectiveRules(EVENT_ID, CLUB_ID))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.scoring.origin).toBe('event')
        expect(result.current.promotion.origin).toBe('club')
    })

    it('n interroge pas les tables de l evenement sans evenement', async () => {
        setup({ scoring_rules: { club_id: CLUB_ID, score_points: CLUB_POINTS } })

        const { result } = renderHook(() => useEffectiveRules(null, CLUB_ID))

        await waitFor(() => expect(result.current.loading).toBe(false))

        const tables = (mockSupabase.from as unknown as { mock: { calls: string[][] } }).mock.calls.map(c => c[0])
        expect(tables).not.toContain('event_scoring_rules')
        expect(tables).toContain('scoring_rules')
        expect(result.current.scoring.origin).toBe('club')
    })

    it('recharge quand l evenement change', async () => {
        setup({
            event_scoring_rules: { event_id: EVENT_ID, score_points: EVENT_POINTS },
        })

        const { result, rerender } = renderHook(
            ({ id }: { id: string }) => useEffectiveRules(id, CLUB_ID),
            { initialProps: { id: EVENT_ID } },
        )

        await waitFor(() => expect(result.current.scoring.origin).toBe('event'))

        // Le second evenement ne porte pas de bareme : on doit redescendre au defaut.
        setup({})
        rerender({ id: 'e-2' })

        await waitFor(() => expect(result.current.scoring.origin).toBe('default'))
    })
})

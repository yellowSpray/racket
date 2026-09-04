import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

/**
 * Deux tables sont interrogees : `event_rounds` pour les numeros de serie, et
 * `event_players` pour les inscrits. Les inscrits sont routes selon la serie
 * demandee, d'ou un builder qui lit la valeur du filtre `round_id`.
 */
const { mockSupabase, roundsBuilder, playersBuilder, playersByRound } = vi.hoisted(() => {
    const playersByRound: Record<string, unknown[]> = {}

    function makeBuild(): MockQueryBuilder {
        const qb = {} as MockQueryBuilder
        qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
        qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb)
        qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
        qb.maybeSingle = vi.fn(() => qb); qb.limit = vi.fn(() => qb)
        qb.lt = vi.fn(() => qb); qb.neq = vi.fn(() => qb); qb.not = vi.fn(() => qb)
        qb.is = vi.fn(() => qb); qb.gte = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
        qb.then = vi.fn()
        qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
        qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
        return qb
    }

    const rb = makeBuild()
    const pb = makeBuild()

    const mock = {
        from: vi.fn((table: string) => (table === 'event_rounds' ? rb : pb)),
        rpc: vi.fn(),
        _builder: rb,
    } as unknown as MockSupabase

    return { mockSupabase: mock, roundsBuilder: rb, playersBuilder: pb, playersByRound }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { usePlayerMovements } from '../usePlayerMovements'

const CURRENT = 'r-current'
const PREVIOUS = 'r-previous'

function player(id: string, first: string, last: string, at = '2026-09-01T10:00:00Z') {
    return {
        profile_id: id,
        registered_at: at,
        profiles: { first_name: first, last_name: last },
    }
}

/** Prepare les reponses : numeros de serie, puis inscrits serie par serie. */
function setup(current: unknown[], previous: unknown[]) {
    for (const k of Object.keys(playersByRound)) delete playersByRound[k]
    playersByRound[CURRENT] = current
    playersByRound[PREVIOUS] = previous

    roundsBuilder._resolve([
        { id: CURRENT, round_number: 4 },
        { id: PREVIOUS, round_number: 3 },
    ])

    playersBuilder.eq = vi.fn((col: string, value: string) => {
        if (col === 'round_id') playersBuilder._resolve(playersByRound[value] ?? [])
        return playersBuilder
    }) as unknown as MockQueryBuilder['eq']
}

describe('usePlayerMovements', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSupabase.from = vi.fn((table: string) =>
            table === 'event_rounds' ? roundsBuilder : playersBuilder
        ) as MockSupabase['from']
    })

    it('rend un etat vide sans serie', () => {
        const { result } = renderHook(() => usePlayerMovements(null, null))

        expect(result.current.movements).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('compte tout le monde comme nouveau sur la premiere serie', async () => {
        setup([player('p1', 'Alice', 'Martin'), player('p2', 'Bob', 'Dupont')], [])

        const { result } = renderHook(() => usePlayerMovements(CURRENT, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.movements).toHaveLength(2)
        expect(result.current.movements.every(m => m.status === 'active')).toBe(true)
    })

    it('compare la serie en cours a la precedente', async () => {
        // Alice reste, Bob arrive, Chloe s'en va.
        setup(
            [player('p1', 'Alice', 'Martin'), player('p2', 'Bob', 'Dupont')],
            [player('p1', 'Alice', 'Martin'), player('p3', 'Chloe', 'Lefevre')],
        )

        const { result } = renderHook(() => usePlayerMovements(CURRENT, PREVIOUS))

        await waitFor(() => expect(result.current.loading).toBe(false))

        const byName = Object.fromEntries(result.current.movements.map(m => [m.firstName, m]))
        expect(Object.keys(byName).sort()).toEqual(['Bob', 'Chloe'])
        expect(byName.Bob.status).toBe('active')
        expect(byName.Chloe.status).toBe('inactive')
    })

    it('rattache chaque mouvement a sa serie', async () => {
        // Un arrivant appartient a la serie en cours, un partant a la precedente.
        setup([player('p2', 'Bob', 'Dupont')], [player('p3', 'Chloe', 'Lefevre')])

        const { result } = renderHook(() => usePlayerMovements(CURRENT, PREVIOUS))

        await waitFor(() => expect(result.current.loading).toBe(false))

        const bob = result.current.movements.find(m => m.firstName === 'Bob')!
        const chloe = result.current.movements.find(m => m.firstName === 'Chloe')!
        expect(bob.roundNumber).toBe(4)
        expect(chloe.roundNumber).toBe(3)
    })

    it('ne lit que les inscriptions rattachees a une serie', async () => {
        // Les lignes au niveau evenement melangeaient deux evenements du club.
        setup([player('p1', 'Alice', 'Martin')], [])

        renderHook(() => usePlayerMovements(CURRENT, null))

        await waitFor(() => expect(mockSupabase.from).toHaveBeenCalledWith('event_players'))
        expect(playersBuilder.eq).toHaveBeenCalledWith('round_id', CURRENT)
    })

    it('classe les arrivants avant les partants', async () => {
        setup([player('p2', 'Bob', 'Dupont')], [player('p3', 'Chloe', 'Lefevre')])

        const { result } = renderHook(() => usePlayerMovements(CURRENT, PREVIOUS))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.movements.map(m => m.status)).toEqual(['active', 'inactive'])
    })
})

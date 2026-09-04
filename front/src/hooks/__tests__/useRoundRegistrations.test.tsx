import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

/**
 * Le hook enchaine plusieurs requetes sur la meme table avec des filtres
 * differents. On route donc les reponses sur la table ET sur les filtres deja
 * appliques, plutot que sur un compteur d'appels fragile.
 */
const { mockSupabase, routes } = vi.hoisted(() => {
    const routes: Record<string, unknown> = {}
    const makeBuilder = (key: string) => {
        const qb = {} as MockQueryBuilder & { _key: string }
        qb._key = key
        const chain = () => qb
        qb.select = vi.fn(chain); qb.insert = vi.fn(chain); qb.update = vi.fn(chain)
        qb.delete = vi.fn(chain); qb.upsert = vi.fn(chain); qb.in = vi.fn(chain)
        qb.order = vi.fn(chain); qb.single = vi.fn(chain); qb.maybeSingle = vi.fn(chain)
        qb.limit = vi.fn(chain); qb.lt = vi.fn(chain); qb.neq = vi.fn(chain)
        qb.not = vi.fn(chain); qb.or = vi.fn(chain)
        qb.is = vi.fn((col: string) => { qb._key += `:is(${col})`; return qb })
        qb.eq = vi.fn((col: string, value: unknown) => { qb._key += `:eq(${col}=${value})`; return qb })
        qb.then = ((onFulfilled: (v: unknown) => unknown) => {
            const data = routes[qb._key] ?? []
            return Promise.resolve({ data, error: null }).then(onFulfilled)
        }) as unknown as ReturnType<typeof vi.fn>
        return qb
    }
    const builders: (MockQueryBuilder & { _key: string })[] = []
    return {
        routes,
        mockSupabase: {
            from: vi.fn((table: string) => { const b = makeBuilder(table); builders.push(b); return b }),
            _builders: builders,
        } as unknown as MockSupabase & { _builders: (MockQueryBuilder & { _key: string })[] },
    }
})

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

import { useRoundRegistrations } from '../useRoundRegistrations'

const EVENT = 'e2'
const ROUND = 'r2'
const PREVIOUS = 'r1'

function setRoutes(config: {
    roundRegs?: { profile_id: string }[]
    eventRegs?: { profile_id: string }[]
    ownGroups?: { group_players: { profile_id: string }[] }[]
    prevGroups?: { group_players: { profile_id: string }[] }[]
}) {
    for (const k of Object.keys(routes)) delete routes[k]
    routes[`event_players:eq(event_id=${EVENT}):eq(round_id=${ROUND})`] = config.roundRegs ?? []
    routes[`event_players:eq(event_id=${EVENT}):is(round_id)`] = config.eventRegs ?? []
    routes[`groups:eq(round_id=${ROUND})`] = config.ownGroups ?? []
    routes[`groups:eq(round_id=${PREVIOUS})`] = config.prevGroups ?? []
}

describe('useRoundRegistrations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSupabase._builders.length = 0
    })

    it('ne charge rien sans serie', async () => {
        renderHook(() => useRoundRegistrations(EVENT, null, null))
        await Promise.resolve()
        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('utilise les inscriptions rattachees a la serie', async () => {
        setRoutes({
            roundRegs: [{ profile_id: 'a' }, { profile_id: 'b' }],
            eventRegs: [{ profile_id: 'pollution' }],
        })
        const { result } = renderHook(() => useRoundRegistrations(EVENT, ROUND, PREVIOUS))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect([...result.current.registeredIds].sort()).toEqual(['a', 'b'])
    })

    it('ignore les inscriptions d\'evenement des qu\'une serie precedente existe', async () => {
        // Le coeur du bug : ces lignes contenaient des joueurs d'un autre evenement.
        setRoutes({
            eventRegs: [{ profile_id: 'venu-ailleurs' }],
            prevGroups: [{ group_players: [{ profile_id: 'x' }, { profile_id: 'y' }] }],
        })
        const { result } = renderHook(() => useRoundRegistrations(EVENT, ROUND, PREVIOUS))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect([...result.current.registeredIds].sort()).toEqual(['x', 'y'])
    })

    it('accepte les inscriptions d\'evenement sur la premiere serie', async () => {
        setRoutes({ eventRegs: [{ profile_id: 'invite' }] })
        const { result } = renderHook(() => useRoundRegistrations(EVENT, ROUND, null))

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect([...result.current.registeredIds]).toEqual(['invite'])
    })

    it('ecrit l\'ensemble herite comme inscriptions de la serie', async () => {
        // Sans cette ecriture, retirer un joueur herite ne supprimerait rien.
        setRoutes({ prevGroups: [{ group_players: [{ profile_id: 'x' }] }] })
        const { result } = renderHook(() => useRoundRegistrations(EVENT, ROUND, PREVIOUS))

        await waitFor(() => expect(result.current.loading).toBe(false))

        const upserts = mockSupabase._builders.filter(b => (b.upsert as ReturnType<typeof vi.fn>).mock.calls.length > 0)
        expect(upserts).toHaveLength(1)
        expect((upserts[0].upsert as ReturnType<typeof vi.fn>).mock.calls[0][0])
            .toEqual([{ event_id: EVENT, profile_id: 'x', round_id: ROUND }])
    })

    it('rattache les ajouts a la serie', async () => {
        setRoutes({ roundRegs: [{ profile_id: 'a' }] })
        const { result } = renderHook(() => useRoundRegistrations(EVENT, ROUND, PREVIOUS))
        await waitFor(() => expect(result.current.loading).toBe(false))

        mockSupabase._builders.length = 0
        await act(async () => { await result.current.addPlayers(['n1', 'n2']) })

        const upsert = mockSupabase._builders.find(b => (b.upsert as ReturnType<typeof vi.fn>).mock.calls.length > 0)
        expect((upsert!.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual([
            { event_id: EVENT, profile_id: 'n1', round_id: ROUND },
            { event_id: EVENT, profile_id: 'n2', round_id: ROUND },
        ])
        expect([...result.current.registeredIds].sort()).toEqual(['a', 'n1', 'n2'])
    })

    it('ne retire que sur la serie courante', async () => {
        setRoutes({ roundRegs: [{ profile_id: 'a' }, { profile_id: 'b' }] })
        const { result } = renderHook(() => useRoundRegistrations(EVENT, ROUND, PREVIOUS))
        await waitFor(() => expect(result.current.loading).toBe(false))

        mockSupabase._builders.length = 0
        await act(async () => { await result.current.removePlayers(['a']) })

        const del = mockSupabase._builders.find(b => (b.delete as ReturnType<typeof vi.fn>).mock.calls.length > 0)
        // Le filtre porte sur l'evenement ET la serie : une inscription a une
        // autre serie du meme evenement ne doit pas sauter.
        expect((del!.eq as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0])).toEqual(['event_id', 'round_id'])
        expect([...result.current.registeredIds]).toEqual(['b'])
    })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.then = vi.fn()
    qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    return { mockSupabase: { from: vi.fn(() => qb), rpc: vi.fn(), _builder: qb } as MockSupabase }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { useClubs } from '../useClub'

/**
 * Colonnes de `clubs` reservees aux utilisateurs connectes. La liste des clubs
 * alimente le menu deroulant de la page d'inscription, lue par le role anonyme
 * qui n'a droit qu'aux colonnes publiques. En demander une reservee ferait
 * echouer la requete entiere et viderait le menu.
 */
const COLONNES_RESERVEES = ['club_email', 'club_address', 'visitor_fee', 'default_', 'logo_url']

describe('useClubs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('ne demande aucune colonne reservee au role anonyme', async () => {
        mockSupabase._builder._resolve([{ id: 'c1', club_name: 'Alpha Club' }])

        renderHook(() => useClubs())

        await waitFor(() => expect(mockSupabase._builder.select).toHaveBeenCalled())

        const demande = (mockSupabase._builder.select as unknown as { mock: { calls: string[][] } })
            .mock.calls[0][0]
        for (const colonne of COLONNES_RESERVEES) {
            expect(demande).not.toContain(colonne)
        }
        // Une etoile ramenerait toutes les colonnes, donc les reservees aussi.
        expect(demande).not.toContain('*')
        expect(demande).toContain('id')
        expect(demande).toContain('club_name')
    })

    it('should fetch clubs on mount and populate state', async () => {
        const clubsData = [
            { id: 'c1', club_name: 'Alpha Club' },
            { id: 'c2', club_name: 'Beta Club' },
        ]

        mockSupabase._builder._resolve(clubsData)

        const { result } = renderHook(() => useClubs())

        // Initially loading
        expect(result.current.loadingClubs).toBe(true)

        await waitFor(() => {
            expect(result.current.loadingClubs).toBe(false)
        })

        expect(result.current.clubs).toEqual(clubsData)
        expect(result.current.errorClubs).toBeNull()
        expect(mockSupabase.from).toHaveBeenCalledWith('clubs')
    })

    it('should set error when fetch fails', async () => {
        mockSupabase._builder._reject('Network error')

        const { result } = renderHook(() => useClubs())

        await waitFor(() => {
            expect(result.current.loadingClubs).toBe(false)
        })

        expect(result.current.errorClubs).toBe('Network error')
        expect(result.current.clubs).toEqual([])
    })

    it('should handle null data gracefully', async () => {
        mockSupabase._builder._resolve(null)

        const { result } = renderHook(() => useClubs())

        await waitFor(() => {
            expect(result.current.loadingClubs).toBe(false)
        })

        expect(result.current.clubs).toEqual([])
        expect(result.current.errorClubs).toBeNull()
    })
})

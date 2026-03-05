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

describe('useClubs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should fetch clubs on mount and populate state', async () => {
        const clubsData = [
            { id: 'c1', club_name: 'Alpha Club', club_address: '123 Main St', club_email: 'alpha@club.com' },
            { id: 'c2', club_name: 'Beta Club', club_address: '456 Oak Ave', club_email: 'beta@club.com' },
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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const { mockSupabase } = vi.hoisted(() => {
    const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        then: vi.fn(),
        _resolve: (data: any) => { const p = Promise.resolve({ data, error: null }); queryBuilder.then = p.then.bind(p); return queryBuilder },
        _reject: (error: any) => { const p = Promise.resolve({ data: null, error: { message: error } }); queryBuilder.then = p.then.bind(p); return queryBuilder },
    }
    return { mockSupabase: { from: vi.fn(() => queryBuilder), rpc: vi.fn(), _builder: queryBuilder } }
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

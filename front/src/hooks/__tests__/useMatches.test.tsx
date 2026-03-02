import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { mockSupabase } = vi.hoisted(() => {
    const qb: any = {
        select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(), then: vi.fn(),
        _resolve: (data: any) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p); return qb },
        _reject: (error: any) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p); return qb },
    }
    return { mockSupabase: { from: vi.fn(() => qb), rpc: vi.fn(), _builder: qb } }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

// Mock matchScheduler since we don't want to test its internals here
vi.mock('@/lib/matchScheduler', () => ({
    generateRoundRobinPairings: vi.fn(),
    calculateTimeSlots: vi.fn(),
    calculateDates: vi.fn(),
    assignMatchesToSlots: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
    intervalToMinutes: vi.fn(() => 30),
    cn: vi.fn(),
}))

import { useMatches } from '../useMatches'

describe('useMatches', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with empty matches, no loading, no error', () => {
        const { result } = renderHook(() => useMatches())

        expect(result.current.matches).toEqual([])
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    describe('fetchMatchesByEvent', () => {
        it('should set matches to empty when eventId is null', async () => {
            const { result } = renderHook(() => useMatches())

            await act(async () => {
                await result.current.fetchMatchesByEvent(null)
            })

            expect(result.current.matches).toEqual([])
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })

        it('should set matches to empty when no groups exist for event', async () => {
            // First call: fetch groups returns empty array
            mockSupabase._builder._resolve([])

            const { result } = renderHook(() => useMatches())

            await act(async () => {
                await result.current.fetchMatchesByEvent('e1')
            })

            expect(result.current.matches).toEqual([])
            expect(result.current.loading).toBe(false)
        })

        it('should fetch matches successfully', async () => {
            const groupsData = [{ id: 'g1' }, { id: 'g2' }]
            const matchesData = [
                {
                    id: 'm1',
                    group_id: 'g1',
                    player1: { id: 'p1', first_name: 'John', last_name: 'Doe' },
                    player2: { id: 'p2', first_name: 'Jane', last_name: 'Smith' },
                    match_date: '2024-01-15',
                    match_time: '19:00',
                },
            ]

            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                if (callCount === 1) {
                    // groups query
                    mockSupabase._builder._resolve(groupsData)
                } else {
                    // matches query
                    mockSupabase._builder._resolve(matchesData)
                }
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useMatches())

            await act(async () => {
                await result.current.fetchMatchesByEvent('e1')
            })

            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBeNull()
            expect(result.current.matches).toEqual(matchesData)
        })

        it('should set error when matches fetch fails', async () => {
            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                if (callCount === 1) {
                    mockSupabase._builder._resolve([{ id: 'g1' }])
                } else {
                    mockSupabase._builder._reject('Matches fetch error')
                }
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useMatches())

            await act(async () => {
                await result.current.fetchMatchesByEvent('e1')
            })

            expect(result.current.error).toBe('Matches fetch error')
            expect(result.current.loading).toBe(false)
        })
    })

    describe('deleteMatchesByEvent', () => {
        it('should delete matches and return true', async () => {
            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                if (callCount === 1) {
                    // fetch groups
                    mockSupabase._builder._resolve([{ id: 'g1' }, { id: 'g2' }])
                } else {
                    // delete matches
                    mockSupabase._builder._resolve(null)
                }
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useMatches())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.deleteMatchesByEvent('e1')
            })

            expect(returnVal).toBe(true)
            expect(result.current.matches).toEqual([])
        })

        it('should return false when delete fails', async () => {
            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                if (callCount === 1) {
                    mockSupabase._builder._resolve([{ id: 'g1' }])
                } else {
                    mockSupabase._builder._reject('Delete error')
                }
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useMatches())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.deleteMatchesByEvent('e1')
            })

            expect(returnVal).toBe(false)
            expect(result.current.error).toBe('Delete error')
        })
    })
})

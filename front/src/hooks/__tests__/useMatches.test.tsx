import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
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

// Mock matchScheduler since we don't want to test its internals here
vi.mock('@/lib/matchScheduler', () => ({
    generateGroupRounds: vi.fn(),
    mapRoundsToDates: vi.fn(),
    assignTimeSlotsForDates: vi.fn().mockReturnValue({ assignments: [], unplaced: [] }),
    calculateTimeSlots: vi.fn(),
    calculateDates: vi.fn(),
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

    describe('updateMatchResults', () => {
        it('should update matches and return true on success', async () => {
            mockSupabase.from.mockImplementation(() => {
                mockSupabase._builder._resolve(null)
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useMatches())

            // Pre-populate matches state by fetching
            // (matches are read-only, so we just verify the supabase call)

            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.updateMatchResults([
                    { matchId: 'm1', winnerId: 'p1', score: '3-1' },
                    { matchId: 'm2', winnerId: 'p3', score: '3-0' },
                ])
            })

            expect(returnVal).toBe(true)
            expect(result.current.error).toBeNull()
            // Verify supabase was called for each result
            expect(mockSupabase.from).toHaveBeenCalledWith('matches')
        })

        it('should return false when update fails', async () => {
            mockSupabase.from.mockImplementation(() => {
                mockSupabase._builder._reject('Update error')
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useMatches())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.updateMatchResults([
                    { matchId: 'm1', winnerId: 'p1', score: '3-1' },
                ])
            })

            expect(returnVal).toBe(false)
            expect(result.current.error).toBe('Update error')
        })

        it('should return true for empty results array', async () => {
            const { result } = renderHook(() => useMatches())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.updateMatchResults([])
            })

            expect(returnVal).toBe(true)
        })
    })
})

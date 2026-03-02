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

import { useGroups } from '../useGroups'

describe('useGroups', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with empty groups, no loading, no error', () => {
        const { result } = renderHook(() => useGroups())

        expect(result.current.groups).toEqual([])
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    describe('fetchGroupsByEvent', () => {
        it('should set groups to empty when eventId is null', async () => {
            const { result } = renderHook(() => useGroups())

            await act(async () => {
                await result.current.fetchGroupsByEvent(null)
            })

            expect(result.current.groups).toEqual([])
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })

        it('should fetch and transform groups successfully', async () => {
            const rawData = [
                {
                    id: 'g1',
                    event_id: 'e1',
                    group_name: 'Box 1',
                    max_players: 4,
                    created_at: '2024-01-01',
                    group_players: [
                        {
                            profile_id: 'p1',
                            profiles: {
                                id: 'p1',
                                first_name: 'John',
                                last_name: 'Doe',
                                phone: '123',
                                power_ranking: '5',
                            },
                        },
                        {
                            profile_id: 'p2',
                            profiles: null, // should be filtered out
                        },
                    ],
                },
            ]

            mockSupabase._builder._resolve(rawData)

            const { result } = renderHook(() => useGroups())

            await act(async () => {
                await result.current.fetchGroupsByEvent('e1')
            })

            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBeNull()
            expect(result.current.groups).toHaveLength(1)
            expect(result.current.groups[0].players!).toHaveLength(1)
            expect(result.current.groups[0].players![0]).toEqual({
                id: 'p1',
                first_name: 'John',
                last_name: 'Doe',
                phone: '123',
                power_ranking: '5',
            })
        })

        it('should set error on fetch failure', async () => {
            mockSupabase._builder._reject('Fetch failed')

            const { result } = renderHook(() => useGroups())

            await act(async () => {
                await result.current.fetchGroupsByEvent('e1')
            })

            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBe('Fetch failed')
            expect(result.current.groups).toEqual([])
        })

        it('should handle player with no power_ranking (defaults to "0")', async () => {
            const rawData = [
                {
                    id: 'g1',
                    event_id: 'e1',
                    group_name: 'Box 1',
                    max_players: 4,
                    created_at: '2024-01-01',
                    group_players: [
                        {
                            profile_id: 'p1',
                            profiles: {
                                id: 'p1',
                                first_name: 'Jane',
                                last_name: 'Smith',
                                phone: '456',
                                power_ranking: null,
                            },
                        },
                    ],
                },
            ]

            mockSupabase._builder._resolve(rawData)

            const { result } = renderHook(() => useGroups())

            await act(async () => {
                await result.current.fetchGroupsByEvent('e1')
            })

            expect(result.current.groups[0].players![0].power_ranking).toBe('0')
        })
    })

    describe('createGroups', () => {
        it('should create groups and refresh', async () => {
            // First call: insert (returns success)
            // Second call: fetchGroupsByEvent refresh
            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                if (callCount === 1) {
                    // insert call
                    mockSupabase._builder._resolve(null)
                } else {
                    // refresh fetch call
                    mockSupabase._builder._resolve([])
                }
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useGroups())

            await act(async () => {
                await result.current.createGroups('e1', 3, 4)
            })

            expect(result.current.loading).toBe(false)
            // Verify insert was called on 'groups' table
            expect(mockSupabase.from).toHaveBeenCalledWith('groups')
            expect(mockSupabase._builder.insert).toHaveBeenCalled()
        })

    })

    describe('deleteGroup', () => {
        it('should call delete on groups table', async () => {
            mockSupabase._builder._resolve(null)

            const { result } = renderHook(() => useGroups())

            await act(async () => {
                await result.current.deleteGroup('g1', 'e1')
            })

            expect(mockSupabase.from).toHaveBeenCalledWith('groups')
            expect(mockSupabase._builder.delete).toHaveBeenCalled()
        })
    })

    describe('assignPlayersToGroup', () => {
        it('should assign players and refresh', async () => {
            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                mockSupabase._builder._resolve(callCount === 1 ? null : [])
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useGroups())

            await act(async () => {
                await result.current.assignPlayersToGroup('g1', ['p1', 'p2'], 'e1')
            })

            expect(result.current.loading).toBe(false)
            expect(mockSupabase.from).toHaveBeenCalledWith('group_players')
        })
    })

    describe('removePlayerFromGroup', () => {
        it('should remove a player and refresh', async () => {
            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                mockSupabase._builder._resolve(callCount === 1 ? null : [])
                return mockSupabase._builder
            })

            const { result } = renderHook(() => useGroups())

            await act(async () => {
                await result.current.removePlayerFromGroup('g1', 'p1', 'e1')
            })

            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBeNull()
        })
    })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const { mockSupabase, mockProfile } = vi.hoisted(() => {
    const qb: any = {
        select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(), then: vi.fn(),
        _resolve: (data: any) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p); return qb },
        _reject: (error: any) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p); return qb },
    }
    return {
        mockSupabase: { from: vi.fn(() => qb), rpc: vi.fn(), _builder: qb },
        mockProfile: { club_id: 'club-1' },
    }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ profile: mockProfile }),
}))

import { useAdminPlayers } from '../useAdminPlayers'

describe('useAdminPlayers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with empty players and fetch on mount', async () => {
        const rawPlayers = [
            {
                id: 'p1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@test.com',
                phone: '123',
                power_ranking: '5',
                player_status: [{ status: 'active' }, { status: 'member' }],
                schedule: [{ arrival: '2024-01-01T19:00:00Z', departure: '2024-01-01T23:00:00Z' }],
                absences: [{ date: '2024-01-05' }],
            },
        ]

        mockSupabase._builder._resolve(rawPlayers)

        const { result } = renderHook(() => useAdminPlayers())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBeNull()
        expect(result.current.players).toHaveLength(1)

        const player = result.current.players[0]
        expect(player.id).toBe('p1')
        expect(player.first_name).toBe('John')
        expect(player.email).toBe('john@test.com')
        // Status should be sorted: member comes before active
        expect(player.status[0]).toBe('member')
        expect(player.status[1]).toBe('active')
    })

    it('should handle players with no schedule or absences', async () => {
        const rawPlayers = [
            {
                id: 'p2',
                first_name: 'Jane',
                last_name: 'Smith',
                email: '',
                phone: '',
                power_ranking: null,
                player_status: [],
                schedule: [],
                absences: [],
            },
        ]

        mockSupabase._builder._resolve(rawPlayers)

        const { result } = renderHook(() => useAdminPlayers())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        const player = result.current.players[0]
        expect(player.arrival).toBe('')
        expect(player.departure).toBe('')
        expect(player.unavailable).toEqual([])
        expect(player.status).toEqual([])
        expect(player.power_ranking).toBe('')
    })

    it('should set error on fetch failure', async () => {
        mockSupabase._builder._reject('Database error')

        const { result } = renderHook(() => useAdminPlayers())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBe('Database error')
    })

    describe('fetchPlayersByEvent', () => {
        it('should fetch all players when eventId is null', async () => {
            mockSupabase._builder._resolve([])

            const { result } = renderHook(() => useAdminPlayers())

            // Wait for initial fetch to complete
            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            mockSupabase._builder._resolve([])

            await act(async () => {
                await result.current.fetchPlayersByEvent(null)
            })

            // Should have called profiles table (fetchPlayer internally)
            expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
        })

        it('should fetch players filtered by event', async () => {
            // Initial mount fetch
            mockSupabase._builder._resolve([])

            const { result } = renderHook(() => useAdminPlayers())

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            const eventPlayers = [
                {
                    id: 'p1',
                    first_name: 'Bob',
                    last_name: 'Martin',
                    email: 'bob@test.com',
                    phone: '999',
                    power_ranking: '3',
                    player_status: [{ status: 'visitor' }],
                    schedule: [],
                    absences: [],
                },
            ]

            mockSupabase._builder._resolve(eventPlayers)

            await act(async () => {
                await result.current.fetchPlayersByEvent('event-1')
            })

            expect(result.current.players).toHaveLength(1)
            expect(result.current.players[0].first_name).toBe('Bob')
        })
    })

    describe('addPlayer', () => {
        it('should call rpc upsert_player with correct params', async () => {
            // Initial mount
            mockSupabase._builder._resolve([])

            const { result } = renderHook(() => useAdminPlayers())

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            // Mock rpc call
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true, profile_id: 'new-p1' },
                error: null,
            })
            // Mock refresh call
            mockSupabase._builder._resolve([])

            await act(async () => {
                await result.current.addPlayer({
                    first_name: 'New',
                    last_name: 'Player',
                    phone: '555',
                    email: 'new@test.com',
                    power_ranking: '7',
                    status: ['member', 'active'],
                })
            })

            expect(mockSupabase.rpc).toHaveBeenCalledWith('upsert_player', expect.objectContaining({
                p_profile_id: null,
                p_first_name: 'New',
                p_last_name: 'Player',
                p_phone: '555',
                p_email: 'new@test.com',
                p_power_ranking: 7,
                p_club_id: 'club-1',
                p_statuses: ['member', 'active'],
            }))
        })

        it('should set error when rpc fails', async () => {
            mockSupabase._builder._resolve([])

            const { result } = renderHook(() => useAdminPlayers())

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            mockSupabase.rpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'RPC failed' },
            })

            await act(async () => {
                await result.current.addPlayer({ first_name: 'Test', last_name: 'User' })
            })

            expect(result.current.error).toBe('RPC failed')
        })
    })

    describe('updatePlayer', () => {
        it('should set error when player is not found', async () => {
            mockSupabase._builder._resolve([])

            const { result } = renderHook(() => useAdminPlayers())

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            await act(async () => {
                await result.current.updatePlayer('non-existent', { first_name: 'Updated' })
            })

            expect(result.current.error).toBe('Joueur non trouvé')
        })

        it('should call rpc with merged player data', async () => {
            const existingPlayers = [
                {
                    id: 'p1',
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@test.com',
                    phone: '123',
                    power_ranking: '5',
                    player_status: [{ status: 'active' }],
                    schedule: [],
                    absences: [],
                },
            ]

            mockSupabase._builder._resolve(existingPlayers)

            const { result } = renderHook(() => useAdminPlayers())

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
                expect(result.current.players).toHaveLength(1)
            })

            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true },
                error: null,
            })
            mockSupabase._builder._resolve([])

            await act(async () => {
                await result.current.updatePlayer('p1', { first_name: 'Johnny' })
            })

            expect(mockSupabase.rpc).toHaveBeenCalledWith('upsert_player', expect.objectContaining({
                p_profile_id: 'p1',
                p_first_name: 'Johnny',
                p_last_name: 'Doe',
                p_email: 'john@test.com',
            }))
        })
    })
})

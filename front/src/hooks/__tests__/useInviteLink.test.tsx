import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase } = vi.hoisted(() => {
    return { mockSupabase: { from: vi.fn(), rpc: vi.fn(), _builder: {} } as unknown as MockSupabase }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { useInviteLink } from '../useInviteLink'

describe('useInviteLink', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useInviteLink())

        expect(result.current.eventInfo).toBeNull()
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    describe('fetchEventByToken', () => {
        it('should fetch event info on success', async () => {
            const eventData = {
                id: 'evt-1',
                event_name: 'Tournoi Squash',
                description: 'Un super tournoi',
                start_date: '2026-04-01',
                end_date: '2026-04-02',
                open_to_visitors: true,
                status: 'active',
                club_name: 'Club Alpha',
                visitor_fee: 10,
            }

            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true, event: eventData },
                error: null,
            })

            const { result } = renderHook(() => useInviteLink())

            await act(async () => {
                await result.current.fetchEventByToken('abc-token-123')
            })

            expect(mockSupabase.rpc).toHaveBeenCalledWith('get_event_by_invite_token', { p_token: 'abc-token-123' })
            expect(result.current.eventInfo).toEqual(eventData)
            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBeNull()
        })

        it('should set error when RPC returns success=false', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: false, error: 'Token invalide ou expiré' },
                error: null,
            })

            const { result } = renderHook(() => useInviteLink())

            await act(async () => {
                await result.current.fetchEventByToken('bad-token')
            })

            expect(result.current.eventInfo).toBeNull()
            expect(result.current.error).toBe('Token invalide ou expiré')
            expect(result.current.loading).toBe(false)
        })

        it('should set error when Supabase returns an error', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'Database connection failed' },
            })

            const { result } = renderHook(() => useInviteLink())

            await act(async () => {
                await result.current.fetchEventByToken('any-token')
            })

            expect(result.current.eventInfo).toBeNull()
            expect(result.current.error).toBe('Database connection failed')
            expect(result.current.loading).toBe(false)
        })

        it('should manage loading state during fetch', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true, event: { id: 'evt-1' } },
                error: null,
            })

            const { result } = renderHook(() => useInviteLink())

            expect(result.current.loading).toBe(false)

            await act(async () => {
                await result.current.fetchEventByToken('token')
            })

            expect(result.current.loading).toBe(false)
        })
    })

    describe('getInviteUrl', () => {
        it('should return correct invite URL format', () => {
            const { result } = renderHook(() => useInviteLink())

            const url = result.current.getInviteUrl('my-token-xyz')

            expect(url).toBe(`${window.location.origin}/events/join/my-token-xyz`)
        })

        it('should handle tokens with special characters', () => {
            const { result } = renderHook(() => useInviteLink())

            const url = result.current.getInviteUrl('token-with-dashes-123')

            expect(url).toBe(`${window.location.origin}/events/join/token-with-dashes-123`)
        })
    })
})

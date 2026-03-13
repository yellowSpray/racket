import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase, mockProfile } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.then = vi.fn()
    qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    return {
        mockSupabase: {
            from: vi.fn(() => qb),
            rpc: vi.fn(),
            functions: { invoke: vi.fn() },
            _builder: qb,
        } as MockSupabase & { functions: { invoke: ReturnType<typeof vi.fn> } },
        mockProfile: { club_id: 'club-1', role: 'admin' as const },
    }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ profile: mockProfile }),
}))

import { useClubMembers } from '../useClubMembers'

describe('useClubMembers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const sampleMembers = [
        {
            id: 'u1',
            first_name: 'Alice',
            last_name: 'Martin',
            email: 'alice@test.com',
            phone: '0612345678',
            role: 'user',
            is_linked: true,
            created_at: '2025-01-15T10:00:00Z',
        },
        {
            id: 'u2',
            first_name: 'Bob',
            last_name: 'Dupont',
            email: 'bob@test.com',
            phone: '0698765432',
            role: 'admin',
            is_linked: true,
            created_at: '2025-02-01T10:00:00Z',
        },
    ]

    it('should initialize with empty members and no loading', () => {
        mockSupabase._builder._resolve([])
        const { result } = renderHook(() => useClubMembers())
        expect(result.current.members).toEqual([])
        expect(result.current.error).toBeNull()
    })

    it('should fetch members and populate state', async () => {
        mockSupabase._builder._resolve(sampleMembers)
        const { result } = renderHook(() => useClubMembers())

        await act(async () => {
            await result.current.fetchMembers('club-1')
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.members).toHaveLength(2)
        expect(result.current.members[0].first_name).toBe('Alice')
        expect(result.current.error).toBeNull()
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should set error when fetch fails', async () => {
        mockSupabase._builder._reject('Network error')
        const { result } = renderHook(() => useClubMembers())

        await act(async () => {
            await result.current.fetchMembers('club-1')
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBe('Network error')
        expect(result.current.members).toEqual([])
    })

    it('should handle null data gracefully', async () => {
        mockSupabase._builder._resolve(null)
        const { result } = renderHook(() => useClubMembers())

        await act(async () => {
            await result.current.fetchMembers('club-1')
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.members).toEqual([])
        expect(result.current.error).toBeNull()
    })

    it('should call Edge Function when inviting a member', async () => {
        mockSupabase.functions.invoke.mockResolvedValue({
            data: { success: true },
            error: null,
        })
        mockSupabase._builder._resolve([])

        const { result } = renderHook(() => useClubMembers())

        await act(async () => {
            await result.current.inviteMember('john@test.com', 'John', 'Doe')
        })

        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('invite-member', {
            body: { email: 'john@test.com', first_name: 'John', last_name: 'Doe' },
        })
    })

    it('should throw when invite Edge Function returns error', async () => {
        mockSupabase.functions.invoke.mockResolvedValue({
            data: { success: false, error: 'Ce membre fait déjà partie de votre club' },
            error: null,
        })

        const { result } = renderHook(() => useClubMembers())

        await expect(
            act(async () => {
                await result.current.inviteMember('existing@test.com')
            })
        ).rejects.toThrow('Ce membre fait déjà partie de votre club')
    })

    it('should call RPC when updating a member role', async () => {
        mockSupabase.rpc.mockResolvedValue({
            data: { success: true },
            error: null,
        })

        const { result } = renderHook(() => useClubMembers())

        await act(async () => {
            await result.current.updateRole('u1', 'admin')
        })

        expect(mockSupabase.rpc).toHaveBeenCalledWith('update_member_role', {
            p_profile_id: 'u1',
            p_new_role: 'admin',
        })
    })

    it('should throw when updateRole RPC returns error', async () => {
        mockSupabase.rpc.mockResolvedValue({
            data: null,
            error: { message: 'Un admin ne peut pas modifier un superadmin' },
        })

        const { result } = renderHook(() => useClubMembers())

        await expect(
            act(async () => {
                await result.current.updateRole('u1', 'superadmin')
            })
        ).rejects.toThrow('Un admin ne peut pas modifier un superadmin')
    })

    it('should call RPC when removing a member', async () => {
        mockSupabase.rpc.mockResolvedValue({
            data: { success: true },
            error: null,
        })

        const { result } = renderHook(() => useClubMembers())

        await act(async () => {
            await result.current.removeMember('u1')
        })

        expect(mockSupabase.rpc).toHaveBeenCalledWith('remove_club_member', {
            p_profile_id: 'u1',
        })
    })

    it('should throw when removeMember RPC returns error', async () => {
        mockSupabase.rpc.mockResolvedValue({
            data: null,
            error: { message: 'Un admin ne peut pas retirer un superadmin' },
        })

        const { result } = renderHook(() => useClubMembers())

        await expect(
            act(async () => {
                await result.current.removeMember('u1')
            })
        ).rejects.toThrow('Un admin ne peut pas retirer un superadmin')
    })
})

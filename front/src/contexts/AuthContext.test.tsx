import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { MockQueryBuilder } from '@/test/mocks/supabase'

const { mockGetSession, mockSignOut, mockOnAuthStateChange, mockQb } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb)
    qb.insert = vi.fn(() => qb)
    qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb)
    qb.upsert = vi.fn(() => qb)
    qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb)
    qb.order = vi.fn(() => qb)
    qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb)
    qb.limit = vi.fn(() => qb)
    qb.lt = vi.fn(() => qb)
    qb.neq = vi.fn(() => qb)
    qb.then = vi.fn()
    qb._resolve = (data: unknown) => {
        const p = Promise.resolve({ data, error: null })
        qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>
        return qb
    }
    qb._reject = (error: string) => {
        const p = Promise.resolve({ data: null, error: { message: error } })
        qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>
        return qb
    }
    return {
        mockGetSession: vi.fn(),
        mockSignOut: vi.fn(),
        mockOnAuthStateChange: vi.fn(),
        mockQb: qb,
    }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: mockGetSession,
            onAuthStateChange: mockOnAuthStateChange,
            signOut: mockSignOut,
        },
        from: vi.fn(() => mockQb),
    },
}))

vi.mock('@/components/shared/Loading', () => ({
    default: () => <div data-testid="loading">Loading...</div>,
}))

import { AuthProvider, useAuth } from './AuthContext'

const mockSession = {
    user: { id: 'user-1', email: 'test@test.com' },
    access_token: 'token-123',
    refresh_token: 'refresh-123',
}

const mockProfile = {
    id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'test@test.com',
    phone: '123456',
    role: 'admin' as const,
    club_id: 'club-1',
}

describe('AuthContext', () => {
    let authStateCallback: ((event: string, session: unknown) => Promise<void>) | null

    beforeEach(() => {
        vi.clearAllMocks()
        authStateCallback = null

        mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => Promise<void>) => {
            authStateCallback = cb
            return {
                data: {
                    subscription: { unsubscribe: vi.fn() },
                },
            }
        })
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
    )

    it('throws when useAuth is used outside AuthProvider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => {
            renderHook(() => useAuth())
        }).toThrow('useAuth doit')
    })

    it('shows loading state initially then resolves', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: null },
            error: null,
        })

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })
    })

    it('sets session and fetches profile when session exists', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
        })

        // Mock profile fetch - single() is the terminal call
        mockQb._resolve(mockProfile)

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.session).toEqual(mockSession)
        expect(result.current.profile).toEqual(mockProfile)
        expect(result.current.user?.id).toBe('user-1')
    })

    it('sets isAuthenticated false when no session', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: null },
            error: null,
        })

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.profile).toBeNull()
        expect(result.current.session).toBeNull()
    })

    it('handles profile fetch error gracefully', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
        })

        mockQb._reject('Profile not found')

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.profile).toBeNull()
    })

    it('signOut calls supabase.auth.signOut', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
        })
        mockQb._resolve(mockProfile)
        mockSignOut.mockResolvedValue({ error: null })

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        await act(async () => {
            await result.current.signOut()
        })

        expect(mockSignOut).toHaveBeenCalled()
    })

    it('handles SIGNED_OUT auth state change by clearing profile and session', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
        })
        mockQb._resolve(mockProfile)

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
            expect(result.current.profile).toEqual(mockProfile)
        })

        // Trigger SIGNED_OUT event
        await act(async () => {
            await authStateCallback?.('SIGNED_OUT', null)
        })

        await waitFor(() => {
            expect(result.current.session).toBeNull()
            expect(result.current.profile).toBeNull()
            expect(result.current.isAuthenticated).toBe(false)
        })
    })

    it('ignores INITIAL_SESSION event', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: null },
            error: null,
        })

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Trigger INITIAL_SESSION - should not change state
        await act(async () => {
            await authStateCallback?.('INITIAL_SESSION', mockSession)
        })

        // Session should remain null since INITIAL_SESSION is ignored
        expect(result.current.isAuthenticated).toBe(false)
    })

    it('updates session on TOKEN_REFRESHED without fetching profile', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
        })
        mockQb._resolve(mockProfile)

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        const refreshedSession = {
            ...mockSession,
            access_token: 'new-token-456',
        }

        // Clear mock calls to track new calls
        vi.mocked(mockQb.select).mockClear()

        await act(async () => {
            await authStateCallback?.('TOKEN_REFRESHED', refreshedSession)
        })

        await waitFor(() => {
            expect(result.current.session).toEqual(refreshedSession)
        })

        // Should NOT have fetched profile again (select not called after TOKEN_REFRESHED)
        expect(mockQb.select).not.toHaveBeenCalled()
    })

    it('handles getSession error gracefully', async () => {
        mockGetSession.mockResolvedValue({
            data: { session: null },
            error: { message: 'Session error' },
        })

        const { result } = renderHook(() => useAuth(), { wrapper })

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.isAuthenticated).toBe(false)
    })
})

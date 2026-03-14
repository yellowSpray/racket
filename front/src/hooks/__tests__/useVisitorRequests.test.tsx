import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.then = vi.fn()
    qb.limit = vi.fn(() => qb); qb.lt = vi.fn(() => qb); qb.neq = vi.fn(() => qb)
    qb.not = vi.fn(() => qb); qb.is = vi.fn(() => qb)
    qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    return { mockSupabase: { from: vi.fn(() => qb), rpc: vi.fn(), _builder: qb } as MockSupabase }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { useVisitorRequests } from '../useVisitorRequests'

const sampleRequests = [
    {
        id: 'req-1',
        event_id: 'evt-1',
        profile_id: 'user-1',
        status: 'pending' as const,
        message: 'I would like to join',
        created_at: '2026-03-10T10:00:00Z',
        updated_at: '2026-03-10T10:00:00Z',
        event: {
            event_name: 'Spring Tournament',
            start_date: '2026-04-01',
            end_date: '2026-04-02',
            clubs: { club_name: 'Tennis Club Paris', visitor_fee: 15 },
        },
    },
    {
        id: 'req-2',
        event_id: 'evt-2',
        profile_id: 'user-1',
        status: 'approved' as const,
        created_at: '2026-03-08T10:00:00Z',
        updated_at: '2026-03-09T10:00:00Z',
        event: {
            event_name: 'Summer Open',
            start_date: '2026-06-15',
            end_date: '2026-06-16',
            clubs: { club_name: 'Squash Club Lyon', visitor_fee: 10 },
        },
    },
]

const samplePendingRequests = [
    {
        id: 'req-3',
        event_id: 'evt-1',
        profile_id: 'user-2',
        status: 'pending' as const,
        message: 'Please accept me',
        created_at: '2026-03-11T10:00:00Z',
        updated_at: '2026-03-11T10:00:00Z',
        profile: {
            first_name: 'Alice',
            last_name: 'Martin',
            email: 'alice@test.com',
            clubs: { club_name: 'Badminton Club Marseille' },
        },
    },
]

describe('useVisitorRequests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with empty requests and no loading/error', () => {
        mockSupabase._builder._resolve([])
        const { result } = renderHook(() => useVisitorRequests())
        expect(result.current.requests).toEqual([])
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    // --- fetchMyRequests ---

    describe('fetchMyRequests', () => {
        it('should fetch and set requests on success', async () => {
            mockSupabase._builder._resolve(sampleRequests)
            const { result } = renderHook(() => useVisitorRequests())

            await act(async () => {
                await result.current.fetchMyRequests()
            })

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            expect(result.current.requests).toHaveLength(2)
            expect(result.current.requests[0].id).toBe('req-1')
            expect(result.current.error).toBeNull()
            expect(mockSupabase.from).toHaveBeenCalledWith('visitor_requests')
            expect(mockSupabase._builder.select).toHaveBeenCalledWith(
                '*, event:events(event_name, start_date, end_date, clubs(club_name, visitor_fee))'
            )
            expect(mockSupabase._builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
        })

        it('should set error when fetch fails', async () => {
            mockSupabase._builder._reject('Network error')
            const { result } = renderHook(() => useVisitorRequests())

            await act(async () => {
                await result.current.fetchMyRequests()
            })

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            expect(result.current.error).toBe('Network error')
            expect(result.current.requests).toEqual([])
        })

        it('should handle null data gracefully', async () => {
            mockSupabase._builder._resolve(null)
            const { result } = renderHook(() => useVisitorRequests())

            await act(async () => {
                await result.current.fetchMyRequests()
            })

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            expect(result.current.requests).toEqual([])
            expect(result.current.error).toBeNull()
        })
    })

    // --- fetchPendingForEvent ---

    describe('fetchPendingForEvent', () => {
        it('should fetch pending requests for a specific event', async () => {
            mockSupabase._builder._resolve(samplePendingRequests)
            const { result } = renderHook(() => useVisitorRequests())

            await act(async () => {
                await result.current.fetchPendingForEvent('evt-1')
            })

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            expect(result.current.requests).toHaveLength(1)
            expect(result.current.requests[0].profile?.first_name).toBe('Alice')
            expect(result.current.error).toBeNull()
            expect(mockSupabase.from).toHaveBeenCalledWith('visitor_requests')
            expect(mockSupabase._builder.select).toHaveBeenCalledWith(
                '*, profile:profiles(first_name, last_name, email, clubs(club_name))'
            )
            expect(mockSupabase._builder.eq).toHaveBeenCalledWith('event_id', 'evt-1')
            expect(mockSupabase._builder.eq).toHaveBeenCalledWith('status', 'pending')
            expect(mockSupabase._builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
        })

        it('should set error when fetch pending fails', async () => {
            mockSupabase._builder._reject('Permission denied')
            const { result } = renderHook(() => useVisitorRequests())

            await act(async () => {
                await result.current.fetchPendingForEvent('evt-1')
            })

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            expect(result.current.error).toBe('Permission denied')
            expect(result.current.requests).toEqual([])
        })
    })

    // --- createRequest ---

    describe('createRequest', () => {
        it('should call rpc with correct params and return success', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true, message: 'Request created' },
                error: null,
            })
            const { result } = renderHook(() => useVisitorRequests())

            let response: { success: boolean; error?: string } | undefined
            await act(async () => {
                response = await result.current.createRequest('evt-1', 'I want to join')
            })

            expect(mockSupabase.rpc).toHaveBeenCalledWith('request_visitor_registration', {
                p_event_id: 'evt-1',
                p_message: 'I want to join',
            })
            expect(response).toEqual({ success: true })
        })

        it('should call rpc without message when not provided', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true, message: 'Request created' },
                error: null,
            })
            const { result } = renderHook(() => useVisitorRequests())

            await act(async () => {
                await result.current.createRequest('evt-1')
            })

            expect(mockSupabase.rpc).toHaveBeenCalledWith('request_visitor_registration', {
                p_event_id: 'evt-1',
                p_message: undefined,
            })
        })

        it('should return error when rpc fails', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'Already requested' },
            })
            const { result } = renderHook(() => useVisitorRequests())

            let response: { success: boolean; error?: string } | undefined
            await act(async () => {
                response = await result.current.createRequest('evt-1')
            })

            expect(response).toEqual({ success: false, error: 'Already requested' })
        })

        it('should return error when rpc data indicates failure', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: false, message: 'Event is full' },
                error: null,
            })
            const { result } = renderHook(() => useVisitorRequests())

            let response: { success: boolean; error?: string } | undefined
            await act(async () => {
                response = await result.current.createRequest('evt-1')
            })

            expect(response).toEqual({ success: false, error: 'Event is full' })
        })
    })

    // --- cancelRequest ---

    describe('cancelRequest', () => {
        it('should update request status to cancelled', async () => {
            mockSupabase._builder._resolve({ id: 'req-1', status: 'cancelled' })
            const { result } = renderHook(() => useVisitorRequests())

            await act(async () => {
                await result.current.cancelRequest('req-1')
            })

            expect(mockSupabase.from).toHaveBeenCalledWith('visitor_requests')
            expect(mockSupabase._builder.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'cancelled' })
            )
            expect(mockSupabase._builder.eq).toHaveBeenCalledWith('id', 'req-1')
        })

        it('should set error when cancel fails', async () => {
            mockSupabase._builder._reject('Cancel failed')
            const { result } = renderHook(() => useVisitorRequests())

            await act(async () => {
                await result.current.cancelRequest('req-1')
            })

            await waitFor(() => {
                expect(result.current.error).toBe('Cancel failed')
            })
        })
    })

    // --- reviewRequest ---

    describe('reviewRequest', () => {
        it('should call rpc with correct params for approval', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true, message: 'Request approved' },
                error: null,
            })
            const { result } = renderHook(() => useVisitorRequests())

            let response: { success: boolean; error?: string } | undefined
            await act(async () => {
                response = await result.current.reviewRequest('req-3', 'approved')
            })

            expect(mockSupabase.rpc).toHaveBeenCalledWith('review_visitor_request', {
                p_request_id: 'req-3',
                p_decision: 'approved',
            })
            expect(response).toEqual({ success: true })
        })

        it('should call rpc with correct params for rejection', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: true, message: 'Request rejected' },
                error: null,
            })
            const { result } = renderHook(() => useVisitorRequests())

            let response: { success: boolean; error?: string } | undefined
            await act(async () => {
                response = await result.current.reviewRequest('req-3', 'rejected')
            })

            expect(mockSupabase.rpc).toHaveBeenCalledWith('review_visitor_request', {
                p_request_id: 'req-3',
                p_decision: 'rejected',
            })
            expect(response).toEqual({ success: true })
        })

        it('should return error when review rpc fails', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'Not authorized' },
            })
            const { result } = renderHook(() => useVisitorRequests())

            let response: { success: boolean; error?: string } | undefined
            await act(async () => {
                response = await result.current.reviewRequest('req-3', 'approved')
            })

            expect(response).toEqual({ success: false, error: 'Not authorized' })
        })

        it('should return error when review rpc data indicates failure', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                data: { success: false, message: 'Request already reviewed' },
                error: null,
            })
            const { result } = renderHook(() => useVisitorRequests())

            let response: { success: boolean; error?: string } | undefined
            await act(async () => {
                response = await result.current.reviewRequest('req-3', 'approved')
            })

            expect(response).toEqual({ success: false, error: 'Request already reviewed' })
        })
    })
})

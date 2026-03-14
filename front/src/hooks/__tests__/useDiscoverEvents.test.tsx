import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase, eventsBuilder, requestsBuilder } = vi.hoisted(() => {
    const createQb = (): MockQueryBuilder => {
        const qb = {} as MockQueryBuilder
        qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
        qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
        qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
        qb.maybeSingle = vi.fn(() => qb); qb.then = vi.fn()
        qb.limit = vi.fn(() => qb); qb.lt = vi.fn(() => qb); qb.neq = vi.fn(() => qb)
        qb.not = vi.fn(() => qb); qb.is = vi.fn(() => qb)
        qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
        qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
        return qb
    }
    const eventsQb = createQb()
    const requestsQb = createQb()
    return {
        mockSupabase: {
            from: vi.fn((table: string) => table === 'visitor_requests' ? requestsQb : eventsQb),
            rpc: vi.fn(),
            _builder: eventsQb,
        } as MockSupabase,
        eventsBuilder: eventsQb,
        requestsBuilder: requestsQb,
    }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { useDiscoverEvents } from '../useDiscoverEvents'

describe('useDiscoverEvents', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const sampleEvents = [
        {
            id: 'evt-1',
            event_name: 'Tournoi Open',
            description: 'Un tournoi ouvert',
            start_date: '2026-04-01',
            end_date: '2026-04-02',
            open_to_visitors: true,
            invite_token: 'token-1',
            club_id: 'club-other',
            clubs: { club_name: 'Club Externe', visitor_fee: 15 },
            event_players: [{ count: 8 }],
        },
        {
            id: 'evt-2',
            event_name: 'Squash Night',
            description: null,
            start_date: '2026-05-10',
            end_date: '2026-05-10',
            open_to_visitors: true,
            invite_token: 'token-2',
            club_id: 'club-other-2',
            clubs: { club_name: 'Club Squash', visitor_fee: 20 },
            event_players: [{ count: 12 }],
        },
    ]

    const sampleRequests = [
        { event_id: 'evt-1', status: 'pending' },
    ]

    it('should initialize with empty events and no loading', () => {
        eventsBuilder._resolve([])
        requestsBuilder._resolve([])
        const { result } = renderHook(() => useDiscoverEvents())
        expect(result.current.events).toEqual([])
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('should fetch events and merge request statuses', async () => {
        eventsBuilder._resolve(sampleEvents)
        requestsBuilder._resolve(sampleRequests)
        const { result } = renderHook(() => useDiscoverEvents())

        await act(async () => {
            await result.current.fetchDiscoverableEvents('club-mine')
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.events).toHaveLength(2)
        expect(result.current.events[0].event_name).toBe('Tournoi Open')
        expect(result.current.events[0].player_count).toBe(8)
        expect(result.current.events[0].my_request_status).toBe('pending')
        expect(result.current.events[1].my_request_status).toBeNull()
        expect(result.current.events[1].player_count).toBe(12)
        expect(result.current.error).toBeNull()

        expect(mockSupabase.from).toHaveBeenCalledWith('events')
        expect(mockSupabase.from).toHaveBeenCalledWith('visitor_requests')
    })

    it('should set error when events fetch fails', async () => {
        eventsBuilder._reject('Network error')
        requestsBuilder._resolve([])
        const { result } = renderHook(() => useDiscoverEvents())

        await act(async () => {
            await result.current.fetchDiscoverableEvents('club-mine')
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBe('Network error')
        expect(result.current.events).toEqual([])
    })

    it('should handle null data gracefully', async () => {
        eventsBuilder._resolve(null)
        requestsBuilder._resolve(null)
        const { result } = renderHook(() => useDiscoverEvents())

        await act(async () => {
            await result.current.fetchDiscoverableEvents('club-mine')
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.events).toEqual([])
        expect(result.current.error).toBeNull()
    })

    it('should map event_players count correctly', async () => {
        const eventsWithNoPlayers = [
            {
                ...sampleEvents[0],
                event_players: [],
            },
        ]
        eventsBuilder._resolve(eventsWithNoPlayers)
        requestsBuilder._resolve([])
        const { result } = renderHook(() => useDiscoverEvents())

        await act(async () => {
            await result.current.fetchDiscoverableEvents('club-mine')
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.events[0].player_count).toBe(0)
    })

    it('should correctly overlay multiple request statuses', async () => {
        const multipleRequests = [
            { event_id: 'evt-1', status: 'approved' },
            { event_id: 'evt-2', status: 'rejected' },
        ]
        eventsBuilder._resolve(sampleEvents)
        requestsBuilder._resolve(multipleRequests)
        const { result } = renderHook(() => useDiscoverEvents())

        await act(async () => {
            await result.current.fetchDiscoverableEvents('club-mine')
        })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.events[0].my_request_status).toBe('approved')
        expect(result.current.events[1].my_request_status).toBe('rejected')
    })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.limit = vi.fn(() => qb); qb.lt = vi.fn(() => qb)
    qb.neq = vi.fn(() => qb); qb.then = vi.fn()
    qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    return { mockSupabase: { from: vi.fn((_table?: string) => qb), _builder: qb } as MockSupabase }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { usePreviousEvent } from '../usePreviousEvent'

const mockEvent = {
    id: 'event-prev',
    club_id: 'club-1',
    event_name: 'Box 1',
    start_date: '2026-01-01',
    end_date: '2026-01-31',
    start_time: '18:00',
    end_time: '21:00',
    number_of_courts: 2,
    estimated_match_duration: '00:30:00',
    playing_dates: ['2026-01-07', '2026-01-14'],
}

const mockGroupsData = [
    {
        id: 'g1', event_id: 'event-prev', group_name: 'Box 1', max_players: 5, created_at: '2026-01-01',
        group_players: [
            { profile_id: 'p1', profiles: { id: 'p1', first_name: 'Alice', last_name: 'A', phone: '01', power_ranking: 10 } },
            { profile_id: 'p2', profiles: { id: 'p2', first_name: 'Bob', last_name: 'B', phone: '02', power_ranking: 8 } },
        ]
    },
]

const mockMatchesData = [
    {
        id: 'm1', group_id: 'g1', player1_id: 'p1', player2_id: 'p2',
        match_date: '2026-01-07', match_time: '18:00', court_number: '1',
        winner_id: 'p1', score: '3-1',
        player1: { id: 'p1', first_name: 'Alice', last_name: 'A' },
        player2: { id: 'p2', first_name: 'Bob', last_name: 'B' },
        group: { id: 'g1', group_name: 'Box 1', event_id: 'event-prev' },
    },
]

describe('usePreviousEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with null state', () => {
        const { result } = renderHook(() => usePreviousEvent())
        expect(result.current.previousEvent).toBeNull()
        expect(result.current.previousGroups).toEqual([])
        expect(result.current.previousMatches).toEqual([])
        expect(result.current.loading).toBe(false)
    })

    it('should do nothing when clubId is null', async () => {
        const { result } = renderHook(() => usePreviousEvent())
        await act(async () => {
            await result.current.fetchPreviousEvent(null, null)
        })
        expect(result.current.previousEvent).toBeNull()
        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should fetch the latest completed event for the club', async () => {
        // First call: fetch event
        const qb = mockSupabase._builder
        qb._resolve(mockEvent)

        const { result } = renderHook(() => usePreviousEvent())
        await act(async () => {
            await result.current.fetchPreviousEvent('club-1', null)
        })

        expect(mockSupabase.from).toHaveBeenCalledWith('events')
        expect(qb.eq).toHaveBeenCalledWith('club_id', 'club-1')
        expect(qb.order).toHaveBeenCalledWith('end_date', { ascending: false })
        expect(qb.limit).toHaveBeenCalledWith(1)
    })

    it('should fetch groups and matches after finding previous event', async () => {
        const qb = mockSupabase._builder

        // Mock chain: event → groups → matches
        qb.then = vi.fn()
        mockSupabase.from.mockImplementation((table?: string) => {
            if (table === 'events') {
                qb._resolve(mockEvent)
            } else if (table === 'groups') {
                qb._resolve(mockGroupsData)
            } else if (table === 'matches') {
                qb._resolve(mockMatchesData)
            }
            return qb
        })

        const { result } = renderHook(() => usePreviousEvent())
        await act(async () => {
            await result.current.fetchPreviousEvent('club-1', null)
        })

        expect(result.current.previousEvent).toEqual(mockEvent)
        expect(result.current.previousGroups.length).toBeGreaterThanOrEqual(0)
    })

    it('should exclude current event when currentEventId is provided', async () => {
        const qb = mockSupabase._builder
        qb._resolve(mockEvent)

        const { result } = renderHook(() => usePreviousEvent())
        await act(async () => {
            await result.current.fetchPreviousEvent('club-1', 'current-event-id')
        })

        expect(qb.neq).toHaveBeenCalledWith('id', 'current-event-id')
    })

    it('should set previousEvent to null if no event found', async () => {
        const qb = mockSupabase._builder
        mockSupabase.from.mockImplementation((_table?: string) => {
            qb._resolve(null)
            return qb
        })

        const { result } = renderHook(() => usePreviousEvent())
        await act(async () => {
            await result.current.fetchPreviousEvent('club-1', null)
        })

        expect(result.current.previousEvent).toBeNull()
        expect(result.current.previousGroups).toEqual([])
    })
})

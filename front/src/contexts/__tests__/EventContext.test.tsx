import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase } = vi.hoisted(() => {
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
        mockSupabase: {
            from: vi.fn(() => qb),
            rpc: vi.fn(),
            _builder: qb,
        } as MockSupabase,
    }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { EventProvider, useEvent } from '../EventContext'

const mockEvents = [
    {
        id: 'e1',
        club_id: 'c1',
        event_name: 'Event 1',
        start_date: '2026-03-01',
        end_date: '2026-03-15',
        number_of_courts: 3,
        event_players: [{ count: 10 }],
    },
    {
        id: 'e2',
        club_id: 'c1',
        event_name: 'Event 2',
        start_date: '2026-02-01',
        end_date: '2026-02-15',
        number_of_courts: 2,
        event_players: [{ count: 5 }],
    },
]

describe('EventContext', () => {
    let mockGetItem: ReturnType<typeof vi.fn>
    let mockSetItem: ReturnType<typeof vi.fn>
    let mockRemoveItem: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()

        mockGetItem = vi.fn().mockReturnValue(null)
        mockSetItem = vi.fn()
        mockRemoveItem = vi.fn()

        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(mockGetItem)
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(mockSetItem)
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(mockRemoveItem)
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
        <EventProvider>{children}</EventProvider>
    )

    it('throws when useEvent is used outside EventProvider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => {
            renderHook(() => useEvent())
        }).toThrow('useEvent doit')
    })

    it('fetches events on mount and sets the most recent as current', async () => {
        mockSupabase._builder._resolve(mockEvents)

        const { result } = renderHook(() => useEvent(), { wrapper })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.events).toHaveLength(2)
        expect(result.current.currentEvent?.id).toBe('e1')
        expect(result.current.currentEvent?.player_count).toBe(10)
        expect(result.current.error).toBeNull()
    })

    it('restores saved event from localStorage if valid', async () => {
        mockGetItem.mockReturnValue('e2')
        mockSupabase._builder._resolve(mockEvents)

        const { result } = renderHook(() => useEvent(), { wrapper })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.currentEvent?.id).toBe('e2')
    })

    it('falls back to most recent if saved event not found', async () => {
        mockGetItem.mockReturnValue('non-existent-id')
        mockSupabase._builder._resolve(mockEvents)

        const { result } = renderHook(() => useEvent(), { wrapper })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.currentEvent?.id).toBe('e1')
        expect(mockSetItem).toHaveBeenCalledWith('selectedEventId', 'e1')
    })

    it('selectEvent(id) updates currentEvent and saves to localStorage', async () => {
        mockSupabase._builder._resolve(mockEvents)

        const { result } = renderHook(() => useEvent(), { wrapper })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        act(() => {
            result.current.setCurrentEvent('e2')
        })

        expect(result.current.currentEvent?.id).toBe('e2')
        expect(mockSetItem).toHaveBeenCalledWith('selectedEventId', 'e2')
    })

    it('selectEvent(null) clears currentEvent and removes from localStorage', async () => {
        mockSupabase._builder._resolve(mockEvents)

        const { result } = renderHook(() => useEvent(), { wrapper })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        act(() => {
            result.current.setCurrentEvent(null)
        })

        expect(result.current.currentEvent).toBeNull()
        expect(mockRemoveItem).toHaveBeenCalledWith('selectedEventId')
    })

    it('sets error when fetch fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        mockSupabase._builder._reject('Database connection failed')

        const { result } = renderHook(() => useEvent(), { wrapper })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBe('Database connection failed')
        expect(result.current.events).toEqual([])
        expect(result.current.currentEvent).toBeNull()
    })

    it('handles empty events array gracefully', async () => {
        mockSupabase._builder._resolve([])

        const { result } = renderHook(() => useEvent(), { wrapper })

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.events).toEqual([])
        expect(result.current.currentEvent).toBeNull()
        expect(result.current.error).toBeNull()
    })
})

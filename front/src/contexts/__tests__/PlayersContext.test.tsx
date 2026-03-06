import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { PlayersContextType } from '@/types/player'

const mockPlayersData = vi.hoisted(() => {
    return {
        players: [
            {
                id: 'p1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@test.com',
                phone: '123',
                arrival: '19:00',
                departure: '23:00',
                unavailable: ['2026-03-05'],
                status: ['active' as const, 'member' as const],
                power_ranking: '5',
                box: 'A',
            },
        ],
        loading: false,
        error: null,
        addPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayerFromEvent: vi.fn(),
        fetchPlayer: vi.fn(),
        fetchPlayersByEvent: vi.fn(),
    } satisfies PlayersContextType
})

vi.mock('@/hooks/useAdminPlayers', () => ({
    useAdminPlayers: () => mockPlayersData,
}))

import { PlayersProvider, usePlayers } from '../PlayersContext'

describe('PlayersContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('throws when usePlayers is used outside PlayersProvider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => {
            renderHook(() => usePlayers())
        }).toThrow('usePlayers must be used within a PlayersProvider')
    })

    it('renders children inside PlayersProvider', () => {
        const wrapper = ({ children }: { children: ReactNode }) => (
            <PlayersProvider>{children}</PlayersProvider>
        )

        const { result } = renderHook(() => usePlayers(), { wrapper })

        expect(result.current).toBeDefined()
    })

    it('returns players data from the hook', () => {
        const wrapper = ({ children }: { children: ReactNode }) => (
            <PlayersProvider>{children}</PlayersProvider>
        )

        const { result } = renderHook(() => usePlayers(), { wrapper })

        expect(result.current.players).toHaveLength(1)
        expect(result.current.players[0].first_name).toBe('John')
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('exposes addPlayer, updatePlayer, removePlayerFromEvent, fetchPlayer, fetchPlayersByEvent', () => {
        const wrapper = ({ children }: { children: ReactNode }) => (
            <PlayersProvider>{children}</PlayersProvider>
        )

        const { result } = renderHook(() => usePlayers(), { wrapper })

        expect(typeof result.current.addPlayer).toBe('function')
        expect(typeof result.current.updatePlayer).toBe('function')
        expect(typeof result.current.removePlayerFromEvent).toBe('function')
        expect(typeof result.current.fetchPlayer).toBe('function')
        expect(typeof result.current.fetchPlayersByEvent).toBe('function')
    })
})

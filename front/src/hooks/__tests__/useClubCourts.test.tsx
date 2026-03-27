import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { MockQueryBuilder, MockSupabase } from '@/test/mocks/supabase'

const { mockSupabase } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.then = vi.fn()
    qb._resolve = (data: unknown) => { const p = Promise.resolve({ data, error: null }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    qb._reject = (error: string) => { const p = Promise.resolve({ data: null, error: { message: error } }); qb.then = p.then.bind(p) as unknown as ReturnType<typeof vi.fn>; return qb }
    return { mockSupabase: { from: vi.fn(() => qb), rpc: vi.fn(), _builder: qb } as MockSupabase }
})

vi.mock('@/lib/supabaseClient', () => ({
    supabase: mockSupabase,
}))

import { useClubCourts } from '../useClubCourts'

describe('useClubCourts', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with empty courts, no loading, no error', () => {
        const { result } = renderHook(() => useClubCourts())

        expect(result.current.courts).toEqual([])
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    describe('fetchClubCourts', () => {
        it('should set courts to empty when clubId is null', async () => {
            const { result } = renderHook(() => useClubCourts())

            await act(async () => {
                await result.current.fetchClubCourts(null)
            })

            expect(result.current.courts).toEqual([])
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })

        it('should fetch courts successfully', async () => {
            const courtsData = [
                { id: 'ct1', club_id: 'c1', court_name: 'Terrain 1', available_from: '19:00', available_to: '23:00', sort_order: 0 },
                { id: 'ct2', club_id: 'c1', court_name: 'Terrain 2', available_from: '19:00', available_to: '23:00', sort_order: 1 },
            ]

            mockSupabase._builder._resolve(courtsData)

            const { result } = renderHook(() => useClubCourts())

            await act(async () => {
                await result.current.fetchClubCourts('c1')
            })

            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBeNull()
            expect(result.current.courts).toEqual(courtsData)
            expect(mockSupabase.from).toHaveBeenCalledWith('club_courts')
        })

        it('should set error on fetch failure', async () => {
            mockSupabase._builder._reject('Fetch courts error')

            const { result } = renderHook(() => useClubCourts())

            await act(async () => {
                await result.current.fetchClubCourts('c1')
            })

            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBe('Fetch courts error')
        })

        it('should handle null data gracefully', async () => {
            mockSupabase._builder._resolve(null)

            const { result } = renderHook(() => useClubCourts())

            await act(async () => {
                await result.current.fetchClubCourts('c1')
            })

            expect(result.current.courts).toEqual([])
        })
    })

    describe('addClubCourt', () => {
        it('should add a court and append to state', async () => {
            const newCourt = {
                id: 'ct1',
                club_id: 'c1',
                court_name: 'Terrain 1',
                available_from: '19:00',
                available_to: '23:00',
                sort_order: 0,
            }

            mockSupabase._builder._resolve(newCourt)

            const { result } = renderHook(() => useClubCourts())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.addClubCourt('c1', {
                    court_name: 'Terrain 1',
                    available_from: '19:00',
                    available_to: '23:00',
                })
            })

            expect(returnVal).toBe(true)
            expect(result.current.courts).toHaveLength(1)
            expect(result.current.courts[0]).toEqual(newCourt)
            expect(mockSupabase.from).toHaveBeenCalledWith('club_courts')
        })

        it('should set error and return false on failure', async () => {
            mockSupabase._builder._reject('Insert court error')

            const { result } = renderHook(() => useClubCourts())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.addClubCourt('c1', {
                    court_name: 'Terrain 1',
                    available_from: '19:00',
                    available_to: '23:00',
                })
            })

            expect(returnVal).toBe(false)
            expect(result.current.error).toBe('Insert court error')
        })
    })

    describe('updateClubCourt', () => {
        it('should update a court in state', async () => {
            const initialCourt = {
                id: 'ct1',
                club_id: 'c1',
                court_name: 'Terrain 1',
                available_from: '19:00',
                available_to: '23:00',
                sort_order: 0,
            }
            const updatedCourt = { ...initialCourt, court_name: 'Terrain A' }

            // First add a court to state
            mockSupabase._builder._resolve(initialCourt)

            const { result } = renderHook(() => useClubCourts())

            await act(async () => {
                await result.current.addClubCourt('c1', {
                    court_name: 'Terrain 1',
                    available_from: '19:00',
                    available_to: '23:00',
                })
            })

            // Now update it
            mockSupabase._builder._resolve(updatedCourt)

            let returnVal: boolean | undefined
            await act(async () => {
                returnVal = await result.current.updateClubCourt('ct1', { court_name: 'Terrain A' })
            })

            expect(returnVal).toBe(true)
            expect(result.current.courts[0].court_name).toBe('Terrain A')
        })

        it('should set error and return false on failure', async () => {
            mockSupabase._builder._reject('Update court error')

            const { result } = renderHook(() => useClubCourts())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.updateClubCourt('ct1', { court_name: 'New Name' })
            })

            expect(returnVal).toBe(false)
            expect(result.current.error).toBe('Update court error')
        })
    })

    describe('removeClubCourt', () => {
        it('should remove a court from state', async () => {
            const court = {
                id: 'ct1',
                club_id: 'c1',
                court_name: 'Terrain 1',
                available_from: '19:00',
                available_to: '23:00',
                sort_order: 0,
            }

            // Add a court first
            mockSupabase._builder._resolve(court)

            const { result } = renderHook(() => useClubCourts())

            await act(async () => {
                await result.current.addClubCourt('c1', {
                    court_name: 'Terrain 1',
                    available_from: '19:00',
                    available_to: '23:00',
                })
            })

            expect(result.current.courts).toHaveLength(1)

            // Now remove it
            mockSupabase._builder._resolve(null)

            let returnVal: boolean | undefined
            await act(async () => {
                returnVal = await result.current.removeClubCourt('ct1')
            })

            expect(returnVal).toBe(true)
            expect(result.current.courts).toHaveLength(0)
        })

        it('should set error and return false on failure', async () => {
            mockSupabase._builder._reject('Delete court error')

            const { result } = renderHook(() => useClubCourts())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.removeClubCourt('ct1')
            })

            expect(returnVal).toBe(false)
            expect(result.current.error).toBe('Delete court error')
        })
    })

    describe('initClubCourts', () => {
        it('should create multiple courts at once', async () => {
            const courtsData = [
                { id: 'ct1', club_id: 'c1', court_name: 'Terrain 1', available_from: '19:00', available_to: '23:00', sort_order: 0 },
                { id: 'ct2', club_id: 'c1', court_name: 'Terrain 2', available_from: '19:00', available_to: '23:00', sort_order: 1 },
                { id: 'ct3', club_id: 'c1', court_name: 'Terrain 3', available_from: '19:00', available_to: '23:00', sort_order: 2 },
            ]

            mockSupabase._builder._resolve(courtsData)

            const { result } = renderHook(() => useClubCourts())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.initClubCourts('c1', 3, '19:00', '23:00')
            })

            expect(returnVal).toBe(true)
            expect(result.current.courts).toHaveLength(3)
            expect(result.current.courts).toEqual(courtsData)
            expect(mockSupabase._builder.insert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ club_id: 'c1', court_name: 'Terrain 1', sort_order: 0 }),
                    expect.objectContaining({ club_id: 'c1', court_name: 'Terrain 2', sort_order: 1 }),
                    expect.objectContaining({ club_id: 'c1', court_name: 'Terrain 3', sort_order: 2 }),
                ])
            )
        })

        it('should set error and return false on failure', async () => {
            mockSupabase._builder._reject('Init courts error')

            const { result } = renderHook(() => useClubCourts())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.initClubCourts('c1', 2, '19:00', '23:00')
            })

            expect(returnVal).toBe(false)
            expect(result.current.error).toBe('Init courts error')
        })
    })
})

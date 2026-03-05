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

import { useClubConfig } from '../useClubConfig'

describe('useClubConfig', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize with null config and default scoring/promotion rules', () => {
        const { result } = renderHook(() => useClubConfig())

        expect(result.current.clubConfig).toBeNull()
        expect(result.current.scoringRules).toBeNull()
        expect(result.current.promotionRules).toBeNull()
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()

        // Verify defaults are exposed
        expect(result.current.defaultScoring).toEqual({
            score_points: [
                { score: "3-0", winner_points: 5, loser_points: 0 },
                { score: "3-1", winner_points: 4, loser_points: 1 },
                { score: "3-2", winner_points: 3, loser_points: 2 },
                { score: "ABS", winner_points: 3, loser_points: -1 },
            ],
        })
        expect(result.current.defaultPromotion).toEqual({
            promoted_count: 1,
            relegated_count: 1,
        })
    })

    describe('fetchClubConfig', () => {
        it('should reset state when clubId is null', async () => {
            const { result } = renderHook(() => useClubConfig())

            await act(async () => {
                await result.current.fetchClubConfig(null)
            })

            expect(result.current.clubConfig).toBeNull()
            expect(result.current.scoringRules).toBeNull()
            expect(result.current.promotionRules).toBeNull()
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })

        it('should fetch club config, scoring rules, and promotion rules', async () => {
            const clubData = {
                id: 'c1',
                club_name: 'Test Club',
                club_address: '123 St',
                club_email: 'test@club.com',
                default_max_players_per_group: 4,
            }
            const scoringData = {
                id: 's1',
                club_id: 'c1',
                score_points: [
                    { score: "3-0", winner_points: 5, loser_points: 0 },
                    { score: "3-1", winner_points: 4, loser_points: 1 },
                    { score: "3-2", winner_points: 3, loser_points: 2 },

                    { score: "ABS", winner_points: 3, loser_points: -1 },
                ],
            }
            const promotionData = {
                id: 'pr1',
                club_id: 'c1',
                promoted_count: 2,
                relegated_count: 1,
            }

            // Promise.all resolves all three simultaneously
            // We need to make each .from() call return the appropriate data
            // Since Promise.all is used, all three builders are created before any awaits
            // The simplest approach: make single/maybeSingle resolve with the right data
            const clubPromise = Promise.resolve({ data: clubData, error: null })
            const scoringPromise = Promise.resolve({ data: scoringData, error: null })
            const promotionPromise = Promise.resolve({ data: promotionData, error: null })

            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                const builder = { ...mockSupabase._builder }
                builder.select = vi.fn().mockReturnValue(builder)
                builder.eq = vi.fn().mockReturnValue(builder)
                builder.order = vi.fn().mockReturnValue(builder)

                if (callCount === 1) {
                    builder.single = vi.fn(() => {
                        builder.then = clubPromise.then.bind(clubPromise)
                        return builder
                    })
                } else if (callCount === 2) {
                    builder.maybeSingle = vi.fn(() => {
                        builder.then = scoringPromise.then.bind(scoringPromise)
                        return builder
                    })
                } else {
                    builder.maybeSingle = vi.fn(() => {
                        builder.then = promotionPromise.then.bind(promotionPromise)
                        return builder
                    })
                }

                return builder
            })

            const { result } = renderHook(() => useClubConfig())

            await act(async () => {
                await result.current.fetchClubConfig('c1')
            })

            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBeNull()
            expect(result.current.clubConfig).toEqual(clubData)
            expect(result.current.scoringRules).toEqual(scoringData)
            expect(result.current.promotionRules).toEqual(promotionData)
        })

        it('should set error when club fetch fails', async () => {
            const errorPromise = Promise.resolve({ data: null, error: { message: 'Club not found' } })
            const okPromise = Promise.resolve({ data: null, error: null })

            let callCount = 0
            mockSupabase.from.mockImplementation(() => {
                callCount++
                const builder = { ...mockSupabase._builder }
                builder.select = vi.fn().mockReturnValue(builder)
                builder.eq = vi.fn().mockReturnValue(builder)

                if (callCount === 1) {
                    builder.single = vi.fn(() => {
                        builder.then = errorPromise.then.bind(errorPromise)
                        return builder
                    })
                } else {
                    builder.maybeSingle = vi.fn(() => {
                        builder.then = okPromise.then.bind(okPromise)
                        return builder
                    })
                }

                return builder
            })

            const { result } = renderHook(() => useClubConfig())

            await act(async () => {
                await result.current.fetchClubConfig('c1')
            })

            expect(result.current.error).toBe('Club not found')
        })
    })

    describe('updateClubDefaults', () => {
        it('should update club defaults and return true on success', async () => {
            mockSupabase._builder._resolve(null)

            const { result } = renderHook(() => useClubConfig())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.updateClubDefaults('c1', {
                    default_max_players_per_group: 6,
                })
            })

            expect(returnVal).toBe(true)
            expect(result.current.error).toBeNull()
            expect(mockSupabase.from).toHaveBeenCalledWith('clubs')
            expect(mockSupabase._builder.update).toHaveBeenCalledWith({
                default_max_players_per_group: 6,
            })
        })

        it('should set error and return false on failure', async () => {
            mockSupabase._builder._reject('Update failed')

            const { result } = renderHook(() => useClubConfig())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.updateClubDefaults('c1', {
                    default_max_players_per_group: 6,
                })
            })

            expect(returnVal).toBe(false)
            expect(result.current.error).toBe('Update failed')
        })
    })

    describe('upsertScoringRules', () => {
        it('should upsert scoring rules and return true', async () => {
            const scorePoints = [
                { score: "3-0", winner_points: 5, loser_points: 0 },
                { score: "3-1", winner_points: 4, loser_points: 1 },
                { score: "3-2", winner_points: 3, loser_points: 2 },
                { score: "ABS", winner_points: 3, loser_points: -1 },
            ]
            const resultData = {
                id: 's1',
                club_id: 'c1',
                score_points: scorePoints,
            }

            mockSupabase._builder._resolve(resultData)

            const { result } = renderHook(() => useClubConfig())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.upsertScoringRules('c1', {
                    score_points: scorePoints,
                })
            })

            expect(returnVal).toBe(true)
            expect(result.current.scoringRules).toEqual(resultData)
            expect(mockSupabase.from).toHaveBeenCalledWith('scoring_rules')
        })

        it('should set error and return false on failure', async () => {
            mockSupabase._builder._reject('Upsert failed')

            const { result } = renderHook(() => useClubConfig())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.upsertScoringRules('c1', {
                    score_points: [
                        { score: "3-0", winner_points: 5, loser_points: 0 },
                    ],
                })
            })

            expect(returnVal).toBe(false)
            expect(result.current.error).toBe('Upsert failed')
        })
    })

    describe('upsertPromotionRules', () => {
        it('should upsert promotion rules and return true', async () => {
            const resultData = {
                id: 'pr1',
                club_id: 'c1',
                promoted_count: 2,
                relegated_count: 2,
            }

            mockSupabase._builder._resolve(resultData)

            const { result } = renderHook(() => useClubConfig())
            let returnVal: boolean | undefined

            await act(async () => {
                returnVal = await result.current.upsertPromotionRules('c1', {
                    promoted_count: 2,
                    relegated_count: 2,
                })
            })

            expect(returnVal).toBe(true)
            expect(result.current.promotionRules).toEqual(resultData)
        })
    })
})

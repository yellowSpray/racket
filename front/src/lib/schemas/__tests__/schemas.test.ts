import { describe, it, expect } from 'vitest'
import { playerSchema } from '@/lib/schemas/player.schema'
import { registerSchema } from '@/lib/schemas/register.schema'
import { eventSchema } from '@/lib/schemas/event.schema'
import { scoringRulesSchema } from '@/lib/schemas/scoring.schema'
import { promotionRulesSchema } from '@/lib/schemas/promotion.schema'
import { clubConfigSchema } from '@/lib/schemas/clubConfig.schema'
import { courtSchema } from '@/lib/schemas/court.schema'

// ──────────────────────────────────────────────
// playerSchema
// ──────────────────────────────────────────────
describe('playerSchema', () => {
  const validPlayer = {
    first_name: 'Jean',
    last_name: 'Dupont',
    phone: '0612345678',
    email: 'jean@example.com',
  }

  it('accepts valid data with required fields only', () => {
    const result = playerSchema.safeParse(validPlayer)
    expect(result.success).toBe(true)
  })

  it('accepts valid data with all optional fields', () => {
    const result = playerSchema.safeParse({
      ...validPlayer,
      arrival: '09:00',
      departure: '18:00',
      power_ranking: 5,
      status: ['active', 'member'],
      unavailable: ['2026-03-10'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty first_name', () => {
    const result = playerSchema.safeParse({ ...validPlayer, first_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty last_name', () => {
    const result = playerSchema.safeParse({ ...validPlayer, last_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects phone shorter than 6 characters', () => {
    const result = playerSchema.safeParse({ ...validPlayer, phone: '12345' })
    expect(result.success).toBe(false)
  })

  it('accepts phone with exactly 6 characters', () => {
    const result = playerSchema.safeParse({ ...validPlayer, phone: '123456' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = playerSchema.safeParse({ ...validPlayer, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects missing first_name', () => {
    const { first_name, ...rest } = validPlayer
    const result = playerSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const { email, ...rest } = validPlayer
    const result = playerSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects wrong type for phone (number instead of string)', () => {
    const result = playerSchema.safeParse({ ...validPlayer, phone: 612345678 })
    expect(result.success).toBe(false)
  })

  it('rejects wrong type for status (string instead of array)', () => {
    const result = playerSchema.safeParse({ ...validPlayer, status: 'active' })
    expect(result.success).toBe(false)
  })

  it('allows optional fields to be undefined', () => {
    const result = playerSchema.safeParse({
      ...validPlayer,
      arrival: undefined,
      departure: undefined,
      power_ranking: undefined,
      status: undefined,
      unavailable: undefined,
    })
    expect(result.success).toBe(true)
  })

})

// ──────────────────────────────────────────────
// registerSchema
// ──────────────────────────────────────────────
describe('registerSchema', () => {
  const validRegister = {
    firstName: 'Marie',
    lastName: 'Curie',
    phoneNumber: '0698765432',
    selectedClub: 'club-123',
    email: 'marie@example.com',
    password: 'secret123',
    confirmPassword: 'secret123',
  }

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse(validRegister)
    expect(result.success).toBe(true)
  })

  it('rejects empty firstName', () => {
    const result = registerSchema.safeParse({ ...validRegister, firstName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty lastName', () => {
    const result = registerSchema.safeParse({ ...validRegister, lastName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects phone shorter than 6 characters', () => {
    const result = registerSchema.safeParse({ ...validRegister, phoneNumber: '12345' })
    expect(result.success).toBe(false)
  })

  it('rejects empty selectedClub', () => {
    const result = registerSchema.safeParse({ ...validRegister, selectedClub: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'bad-email' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 6 characters', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: '12345',
      confirmPassword: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty confirmPassword', () => {
    const result = registerSchema.safeParse({ ...validRegister, confirmPassword: '' })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'password1',
      confirmPassword: 'password2',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmErr = result.error.issues.find(
        (issue) => issue.path?.includes('confirmPassword')
      )
      expect(confirmErr).toBeDefined()
    }
  })

  it('accepts matching passwords of exactly 6 characters', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: '123456',
      confirmPassword: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = registerSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects wrong type for email (number)', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 42 })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────────────
// eventSchema
// ──────────────────────────────────────────────
describe('eventSchema', () => {
  const validEvent = {
    event_name: 'Tournoi de Printemps',
    start_date: '2026-03-15',
    end_date: '2026-03-17',
    number_of_courts: 3,
  }

  it('accepts valid event with required fields only', () => {
    const result = eventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })

  it('accepts valid event with all optional fields', () => {
    const result = eventSchema.safeParse({
      ...validEvent,
      description: 'Un super tournoi',
      start_time: '09:00',
      end_time: '18:00',
      estimated_match_duration: 30,
      playing_dates: ['2026-03-15', '2026-03-16', '2026-03-17'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty event_name', () => {
    const result = eventSchema.safeParse({ ...validEvent, event_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty start_date', () => {
    const result = eventSchema.safeParse({ ...validEvent, start_date: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty end_date', () => {
    const result = eventSchema.safeParse({ ...validEvent, end_date: '' })
    expect(result.success).toBe(false)
  })

  it('rejects number_of_courts less than 1', () => {
    const result = eventSchema.safeParse({ ...validEvent, number_of_courts: 0 })
    expect(result.success).toBe(false)
  })

  it('accepts number_of_courts equal to 1', () => {
    const result = eventSchema.safeParse({ ...validEvent, number_of_courts: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects estimated_match_duration less than 5', () => {
    const result = eventSchema.safeParse({ ...validEvent, estimated_match_duration: 4 })
    expect(result.success).toBe(false)
  })

  it('accepts estimated_match_duration equal to 5', () => {
    const result = eventSchema.safeParse({ ...validEvent, estimated_match_duration: 5 })
    expect(result.success).toBe(true)
  })

  it('rejects estimated_match_duration greater than 180', () => {
    const result = eventSchema.safeParse({ ...validEvent, estimated_match_duration: 181 })
    expect(result.success).toBe(false)
  })

  it('accepts estimated_match_duration equal to 180', () => {
    const result = eventSchema.safeParse({ ...validEvent, estimated_match_duration: 180 })
    expect(result.success).toBe(true)
  })

  it('rejects end_date before start_date (cross-field validation)', () => {
    const result = eventSchema.safeParse({
      ...validEvent,
      start_date: '2026-03-17',
      end_date: '2026-03-15',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const endDateErr = result.error.issues.find(
        (issue) => issue.path?.includes('end_date')
      )
      expect(endDateErr).toBeDefined()
    }
  })

  it('accepts same start_date and end_date', () => {
    const result = eventSchema.safeParse({
      ...validEvent,
      start_date: '2026-03-15',
      end_date: '2026-03-15',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid deadline', () => {
    const result = eventSchema.safeParse({
      ...validEvent,
      deadline: '2026-04-01',
    })
    expect(result.success).toBe(true)
  })

  it('accepts undefined deadline', () => {
    const result = eventSchema.safeParse({
      ...validEvent,
      deadline: undefined,
    })
    expect(result.success).toBe(true)
  })

  it('accepts event without deadline field', () => {
    const result = eventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.deadline).toBeUndefined()
    }
  })

  it('rejects wrong type for number_of_courts (string instead of number)', () => {
    const result = eventSchema.safeParse({ ...validEvent, number_of_courts: '3' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = eventSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────────────
// scoringRulesSchema
// ──────────────────────────────────────────────
describe('scoringRulesSchema', () => {
  const validScoring = {
    score_points: [
      { score: '3-0', winner_points: 5, loser_points: 0 },
      { score: '3-1', winner_points: 4, loser_points: 1 },
      { score: '3-2', winner_points: 3, loser_points: 2 },

      { score: 'ABS', winner_points: 3, loser_points: -1 },
    ],
  }

  it('accepts valid scoring rules with score_points array', () => {
    const result = scoringRulesSchema.safeParse(validScoring)
    expect(result.success).toBe(true)
  })

  it('accepts a single entry', () => {
    const result = scoringRulesSchema.safeParse({
      score_points: [{ score: '3-0', winner_points: 5, loser_points: 0 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts negative loser_points (e.g. ABS penalty)', () => {
    const result = scoringRulesSchema.safeParse({
      score_points: [{ score: 'ABS', winner_points: 3, loser_points: -1 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty score_points array', () => {
    const result = scoringRulesSchema.safeParse({ score_points: [] })
    expect(result.success).toBe(false)
  })

  it('rejects missing score_points field', () => {
    const result = scoringRulesSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects entry with empty score string', () => {
    const result = scoringRulesSchema.safeParse({
      score_points: [{ score: '', winner_points: 5, loser_points: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects entry with wrong type for winner_points (string)', () => {
    const result = scoringRulesSchema.safeParse({
      score_points: [{ score: '3-0', winner_points: '5', loser_points: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects entry with non-integer points', () => {
    const result = scoringRulesSchema.safeParse({
      score_points: [{ score: '3-0', winner_points: 5.5, loser_points: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts all zero values', () => {
    const result = scoringRulesSchema.safeParse({
      score_points: [{ score: '3-0', winner_points: 0, loser_points: 0 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts large positive values', () => {
    const result = scoringRulesSchema.safeParse({
      score_points: [{ score: '3-0', winner_points: 100, loser_points: 50 }],
    })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────────────
// promotionRulesSchema
// ──────────────────────────────────────────────
describe('promotionRulesSchema', () => {
  const validPromotion = {
    promoted_count: 2,
    relegated_count: 2,
  }

  it('accepts valid promotion rules', () => {
    const result = promotionRulesSchema.safeParse(validPromotion)
    expect(result.success).toBe(true)
  })

  it('accepts zero for both counts', () => {
    const result = promotionRulesSchema.safeParse({
      promoted_count: 0,
      relegated_count: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts maximum values (10)', () => {
    const result = promotionRulesSchema.safeParse({
      promoted_count: 10,
      relegated_count: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects promoted_count less than 0', () => {
    const result = promotionRulesSchema.safeParse({ ...validPromotion, promoted_count: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects promoted_count greater than 10', () => {
    const result = promotionRulesSchema.safeParse({ ...validPromotion, promoted_count: 11 })
    expect(result.success).toBe(false)
  })

  it('rejects relegated_count less than 0', () => {
    const result = promotionRulesSchema.safeParse({ ...validPromotion, relegated_count: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects relegated_count greater than 10', () => {
    const result = promotionRulesSchema.safeParse({ ...validPromotion, relegated_count: 11 })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = promotionRulesSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects wrong type (string instead of number)', () => {
    const result = promotionRulesSchema.safeParse({
      promoted_count: '2',
      relegated_count: '2',
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────────────
// clubConfigSchema
// ──────────────────────────────────────────────
describe('clubConfigSchema', () => {
  const validClubConfig = {
    club_name: 'Squash Club Paris',
    default_min_players_per_group: 3,
    default_max_players_per_group: 4,
    visitor_fee: 5,
    default_start_time: '19:00',
    default_end_time: '23:00',
    default_number_of_courts: 4,
    default_match_duration: 30,
  }

  it('accepts valid club config with required fields only', () => {
    const result = clubConfigSchema.safeParse(validClubConfig)
    expect(result.success).toBe(true)
  })

  it('accepts valid club config with all optional fields', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      club_address: '12 Rue du Sport, Paris',
      club_email: 'contact@squashclub.fr',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty club_name', () => {
    const result = clubConfigSchema.safeParse({ ...validClubConfig, club_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects default_max_players_per_group less than 2', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      default_max_players_per_group: 1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts default_max_players_per_group equal to 2', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      default_max_players_per_group: 2,
    })
    expect(result.success).toBe(true)
  })

  it('rejects default_max_players_per_group greater than 10', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      default_max_players_per_group: 11,
    })
    expect(result.success).toBe(false)
  })

  it('accepts default_max_players_per_group equal to 10', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      default_max_players_per_group: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid club_email', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      club_email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string for club_email', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      club_email: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts undefined club_email', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      club_email: undefined,
    })
    expect(result.success).toBe(true)
  })

  it('accepts undefined club_address', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      club_address: undefined,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = clubConfigSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects wrong type for default_max_players_per_group (string)', () => {
    const result = clubConfigSchema.safeParse({
      ...validClubConfig,
      default_max_players_per_group: '4',
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────────────
// courtSchema
// ──────────────────────────────────────────────
describe('courtSchema', () => {
  const validCourt = {
    court_name: 'Court 1',
    available_from: '09:00',
    available_to: '18:00',
  }

  it('accepts valid court data', () => {
    const result = courtSchema.safeParse(validCourt)
    expect(result.success).toBe(true)
  })

  it('rejects empty court_name', () => {
    const result = courtSchema.safeParse({ ...validCourt, court_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty available_from', () => {
    const result = courtSchema.safeParse({ ...validCourt, available_from: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty available_to', () => {
    const result = courtSchema.safeParse({ ...validCourt, available_to: '' })
    expect(result.success).toBe(false)
  })

  it('rejects available_to before available_from (cross-field validation)', () => {
    const result = courtSchema.safeParse({
      ...validCourt,
      available_from: '18:00',
      available_to: '09:00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const timeErr = result.error.issues.find(
        (issue) => issue.path?.includes('available_to')
      )
      expect(timeErr).toBeDefined()
    }
  })

  it('rejects available_to equal to available_from (cross-field validation)', () => {
    const result = courtSchema.safeParse({
      ...validCourt,
      available_from: '10:00',
      available_to: '10:00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const timeErr = result.error.issues.find(
        (issue) => issue.path?.includes('available_to')
      )
      expect(timeErr).toBeDefined()
    }
  })

  it('accepts available_to one minute after available_from', () => {
    const result = courtSchema.safeParse({
      ...validCourt,
      available_from: '09:00',
      available_to: '09:01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = courtSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects wrong type for court_name (number)', () => {
    const result = courtSchema.safeParse({ ...validCourt, court_name: 123 })
    expect(result.success).toBe(false)
  })

  it('rejects wrong type for available_from (number)', () => {
    const result = courtSchema.safeParse({ ...validCourt, available_from: 900 })
    expect(result.success).toBe(false)
  })
})

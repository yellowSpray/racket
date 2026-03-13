import { describe, it, expect } from 'vitest'
import { inviteMemberSchema } from '@/lib/schemas/inviteMember.schema'

describe('inviteMemberSchema', () => {
  const validInvite = {
    email: 'john@example.com',
  }

  it('accepts valid data with email only', () => {
    const result = inviteMemberSchema.safeParse(validInvite)
    expect(result.success).toBe(true)
  })

  it('accepts valid data with all optional fields', () => {
    const result = inviteMemberSchema.safeParse({
      ...validInvite,
      first_name: 'John',
      last_name: 'Doe',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = inviteMemberSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = inviteMemberSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const result = inviteMemberSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('allows first_name to be undefined', () => {
    const result = inviteMemberSchema.safeParse({ ...validInvite, first_name: undefined })
    expect(result.success).toBe(true)
  })

  it('allows last_name to be undefined', () => {
    const result = inviteMemberSchema.safeParse({ ...validInvite, last_name: undefined })
    expect(result.success).toBe(true)
  })

  it('allows empty string for first_name', () => {
    const result = inviteMemberSchema.safeParse({ ...validInvite, first_name: '' })
    expect(result.success).toBe(true)
  })

  it('allows empty string for last_name', () => {
    const result = inviteMemberSchema.safeParse({ ...validInvite, last_name: '' })
    expect(result.success).toBe(true)
  })
})

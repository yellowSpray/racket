import { describe, it, expect } from 'vitest'
import { forgotPasswordSchema } from '../forgotPassword.schema'

describe('forgotPasswordSchema', () => {
  it('accepte un email valide', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejette un email vide', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('rejette un email invalide', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'pas-un-email' })
    expect(result.success).toBe(false)
  })

  it('retourne un message en français', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'invalide' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path?.includes('email'))
      expect(emailError?.message).toBe('Adresse email invalide')
    }
  })
})

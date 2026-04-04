import { describe, it, expect } from 'vitest'
import { resetPasswordSchema } from '../resetPassword.schema'

describe('resetPasswordSchema', () => {
  it('accepte des mots de passe valides et identiques', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'motdepasse123',
      confirmPassword: 'motdepasse123',
    })
    expect(result.success).toBe(true)
  })

  it('rejette un mot de passe trop court', () => {
    const result = resetPasswordSchema.safeParse({
      password: '123',
      confirmPassword: '123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwError = result.error.issues.find(i => i.path?.includes('password'))
      expect(pwError?.message).toBe('Le mot de passe doit contenir au moins 6 caractères')
    }
  })

  it('rejette si confirmPassword est vide', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'motdepasse123',
      confirmPassword: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejette si les mots de passe ne correspondent pas', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'motdepasse123',
      confirmPassword: 'different456',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find(i =>
        i.path?.includes('confirmPassword')
      )
      expect(confirmError?.message).toBe('Les mots de passe ne correspondent pas')
    }
  })
})

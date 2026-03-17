import { z } from 'zod'

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { error: 'Le mot de passe doit contenir au moins 6 caractères' }),
    confirmPassword: z.string().min(1, { error: 'Veuillez confirmer le mot de passe' }),
  })
  .check((ctx) => {
    if (ctx.value.password !== ctx.value.confirmPassword) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.confirmPassword,
        message: 'Les mots de passe ne correspondent pas',
        path: ['confirmPassword'],
      })
    }
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

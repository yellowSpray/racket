import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.email({ error: 'Adresse email invalide' }),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

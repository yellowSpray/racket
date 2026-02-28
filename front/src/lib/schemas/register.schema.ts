import { z } from 'zod'

export const registerSchema = z
  .object({
    firstName: z.string().min(1, { error: 'Le prénom est requis' }),
    lastName: z.string().min(1, { error: 'Le nom est requis' }),
    phoneNumber: z.string().min(6, { error: 'Numéro de téléphone trop court' }),
    selectedClub: z.string().min(1, { error: 'Veuillez sélectionner un club' }),
    email: z.email({ error: 'Adresse email invalide' }),
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

export type RegisterFormData = z.infer<typeof registerSchema>

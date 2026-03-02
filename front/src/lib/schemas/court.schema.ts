import { z } from 'zod'

export const courtSchema = z
  .object({
    court_name: z.string().min(1, { error: 'Nom du terrain requis' }),
    available_from: z.string().min(1, { error: 'Heure de début requise' }),
    available_to: z.string().min(1, { error: 'Heure de fin requise' }),
  })
  .check((ctx) => {
    if (
      ctx.value.available_from &&
      ctx.value.available_to &&
      ctx.value.available_from >= ctx.value.available_to
    ) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.available_to,
        message: "L'heure de fin doit être après l'heure de début",
        path: ['available_to'],
      })
    }
  })

export type CourtFormData = z.infer<typeof courtSchema>

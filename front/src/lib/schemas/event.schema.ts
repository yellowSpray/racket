import { z } from 'zod'

export const eventSchema = z
  .object({
    event_name: z.string().min(1, { error: "Nom de l'événement requis" }),
    description: z.string().optional(),
    start_date: z.string().min(1, { error: 'Date de début requise' }),
    end_date: z.string().min(1, { error: 'Date de fin requise' }),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    number_of_courts: z
      .number()
      .min(1, { error: 'Au moins 1 terrain requis' }),
    estimated_match_duration: z
      .number()
      .min(5, { error: 'Minimum 5 minutes' })
      .max(180, { error: 'Maximum 180 minutes' })
      .optional(),
    playing_dates: z
      .array(z.string())
      .optional(),
    deadline: z.string().optional(),
  })
  .check((ctx) => {
    if (
      ctx.value.start_date &&
      ctx.value.end_date &&
      ctx.value.start_date > ctx.value.end_date
    ) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.end_date,
        message: 'La date de fin doit être après la date de début',
        path: ['end_date'],
      })
    }
  })

export type EventFormData = z.infer<typeof eventSchema>

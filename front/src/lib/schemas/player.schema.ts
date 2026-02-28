import { z } from 'zod'

export const playerSchema = z.object({
  first_name: z.string().min(1, { error: 'Prénom requis' }),
  last_name: z.string().min(1, { error: 'Nom requis' }),
  phone: z.string().min(6, { error: 'Numéro trop court' }),
  email: z.email({ error: 'Email invalide' }),
  arrival: z.string().optional(),
  departure: z.string().optional(),
  power_ranking: z.string().optional(),
  status: z.array(z.string()).optional(),
  unavailable: z.array(z.string()).optional(),
})

export type PlayerFormData = z.infer<typeof playerSchema>

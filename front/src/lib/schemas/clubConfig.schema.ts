import { z } from 'zod'

export const clubConfigSchema = z.object({
  club_name: z.string().min(1, { error: 'Nom du club requis' }),
  club_address: z.string().optional(),
  club_email: z.string().email({ error: 'Email invalide' }).optional().or(z.literal('')),
  default_min_players_per_group: z
    .number()
    .min(2, { error: 'Minimum 2 joueurs' })
    .max(10, { error: 'Maximum 10 joueurs' }),
  default_max_players_per_group: z
    .number()
    .min(2, { error: 'Minimum 2 joueurs' })
    .max(10, { error: 'Maximum 10 joueurs' }),
  visitor_fee: z
    .number()
    .min(0, { error: 'Le tarif ne peut pas être négatif' }),
  default_start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { error: 'Format HH:MM attendu' }),
  default_end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { error: 'Format HH:MM attendu' }),
  default_number_of_courts: z
    .number()
    .int({ error: 'Nombre entier requis' })
    .min(1, { error: 'Au moins 1 terrain requis' })
    .max(20, { error: 'Maximum 20 terrains' }),
  default_match_duration: z
    .number()
    .int({ error: 'Nombre entier requis' })
    .min(5, { error: 'Minimum 5 minutes' })
    .max(180, { error: 'Maximum 180 minutes' }),
})

export type ClubConfigFormData = z.infer<typeof clubConfigSchema>

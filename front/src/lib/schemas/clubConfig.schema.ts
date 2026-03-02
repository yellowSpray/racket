import { z } from 'zod'

export const clubConfigSchema = z.object({
  club_name: z.string().min(1, { error: 'Nom du club requis' }),
  club_address: z.string().optional(),
  club_email: z.string().email({ error: 'Email invalide' }).optional().or(z.literal('')),
  default_max_players_per_group: z
    .number()
    .min(2, { error: 'Minimum 2 joueurs' })
    .max(10, { error: 'Maximum 10 joueurs' }),
})

export type ClubConfigFormData = z.infer<typeof clubConfigSchema>

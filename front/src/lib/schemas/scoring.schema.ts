import { z } from 'zod'

export const scoringRulesSchema = z.object({
  points_win: z.number().min(0, { error: 'Minimum 0 points' }),
  points_loss: z.number().min(0, { error: 'Minimum 0 points' }),
  points_draw: z.number().min(0, { error: 'Minimum 0 points' }),
  points_walkover_win: z.number().min(0, { error: 'Minimum 0 points' }),
  points_walkover_loss: z.number().min(0, { error: 'Minimum 0 points' }),
  points_absence: z.number().min(0, { error: 'Minimum 0 points' }),
})

export type ScoringRulesFormData = z.infer<typeof scoringRulesSchema>

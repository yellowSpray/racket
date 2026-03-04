import { z } from 'zod'

export const scorePointsEntrySchema = z.object({
  score: z.string().min(1),
  winner_points: z.number().int(),
  loser_points: z.number().int(),
})

export const scoringRulesSchema = z.object({
  score_points: z
    .array(scorePointsEntrySchema)
    .min(1, { message: 'Au moins une entrée requise' }),
})

export type ScoringRulesFormData = z.infer<typeof scoringRulesSchema>

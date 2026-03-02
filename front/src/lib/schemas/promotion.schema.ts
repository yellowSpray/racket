import { z } from 'zod'

export const promotionRulesSchema = z.object({
  promoted_count: z.number().min(0, { error: 'Minimum 0' }).max(10, { error: 'Maximum 10' }),
  relegated_count: z.number().min(0, { error: 'Minimum 0' }).max(10, { error: 'Maximum 10' }),
})

export type PromotionRulesFormData = z.infer<typeof promotionRulesSchema>

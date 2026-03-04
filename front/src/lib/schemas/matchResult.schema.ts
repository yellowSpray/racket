import { z } from "zod"

export const matchResultSchema = z.object({
    score: z
        .string()
        .min(1, { message: "Le score est requis" })
        .regex(/^(WO|\d+-\d+(\s+\d+-\d+)*)$/, {
            message: "Format invalide (ex: 3-1 ou 15-12 15-8)",
        }),
})

export type MatchResultFormData = z.infer<typeof matchResultSchema>

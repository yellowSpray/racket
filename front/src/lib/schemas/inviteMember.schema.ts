import { z } from 'zod'

export const inviteMemberSchema = z.object({
    email: z.email({ error: 'Email invalide' }),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
})

export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>

import { z } from 'zod'

export const UserRoleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['OWNER', 'KASIR', 'MEMBER']),
})

export type UserRoleInput = z.infer<typeof UserRoleSchema>

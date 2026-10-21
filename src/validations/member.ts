import { z } from 'zod'

export const MemberInputSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(100),
  telepon: z.string().trim().max(20).optional(),
  email: z
    .string()
    .trim()
    .email('Email tidak valid')
    .max(100)
    .optional()
    .or(z.literal('')),
  alamat: z.string().trim().max(300).optional(),
})

export const UpdateMemberSchema = z.object({
  id: z.string().min(1),
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(100).optional(),
  telepon: z.string().trim().max(20).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Email tidak valid')
    .max(100)
    .optional()
    .or(z.literal('')),
  alamat: z.string().trim().max(300).optional(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).optional(),
  diskonPersen: z
    .number()
    .int()
    .min(0, 'Minimal 0')
    .max(100, 'Maksimal 100')
    .optional(),
})

export type MemberInput = z.infer<typeof MemberInputSchema>
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>

export const MemberIdSchema = z.object({
  id: z.string().min(1),
})

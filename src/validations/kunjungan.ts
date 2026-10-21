import { z } from 'zod'

export const RecordPageVisitSchema = z.object({
  path: z.string().min(1),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export type RecordPageVisitInput = z.infer<typeof RecordPageVisitSchema>

export const GrupKunjunganSchema = z.enum([
  'harian',
  'mingguan',
  'bulanan',
  'tahunan',
])
export type GrupKunjungan = z.infer<typeof GrupKunjunganSchema>

export const KunjunganQuerySchema = z.object({
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  grup: GrupKunjunganSchema.default('harian'),
  userType: z.enum(['member', 'non-member']).optional(),
})

export type KunjunganQueryInput = z.infer<typeof KunjunganQuerySchema>

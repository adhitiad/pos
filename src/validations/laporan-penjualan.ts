import { z } from 'zod'

const GrupSchema = z.enum(['harian', 'mingguan', 'bulanan'])
export type Grup = z.infer<typeof GrupSchema>

export const LaporanPenjualanSchema = z.object({
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grup: GrupSchema.default('harian'),
})

export type LaporanPenjualanInput = z.infer<typeof LaporanPenjualanSchema>

export const FormatEksporSchema = z.enum(['csv', 'xlsx', 'pdf'])

// Pencarian halaman laporan penjualan (semua field opsional).
export const LaporanSearchSchema = z.object({
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  grup: GrupSchema.optional(),
  userType: z.enum(['member', 'non-member']).optional(),
})

import { z } from 'zod'

const GrupSchema = z.enum(['harian', 'mingguan', 'bulanan'])
export type Grup = z.infer<typeof GrupSchema>

export const LaporanPajakSchema = z.object({
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grup: GrupSchema.default('bulanan'),
})

export type LaporanPajakInput = z.infer<typeof LaporanPajakSchema>

// Pencarian halaman laporan pajak (semua field opsional).
export const LaporanPajakSearchSchema = z.object({
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  grup: GrupSchema.optional(),
})

export const FormatEksporPajakSchema = z.enum(['csv', 'xlsx', 'pdf'])

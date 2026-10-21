import { z } from 'zod'

export const LaporanSchema = z.object({
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  akunId: z.string().min(1).optional(),
})

export type LaporanInput = z.infer<typeof LaporanSchema>

// Pencarian halaman buku besar (semua field opsional).
export const BukuBesarSearchSchema = z.object({
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  akunId: z.string().optional(),
})

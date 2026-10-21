import { z } from 'zod'

import { SumberBelanjaSchema } from '#/validations/pembelian-bahan'

export const LaporanBelanjaSchema = z.object({
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplierId: z.string().optional(),
  // Filter sumber belanja: supplier, pasar online, atau pasar offline.
  sumberBelanja: SumberBelanjaSchema.optional(),
})

export type LaporanBelanjaInput = z.infer<typeof LaporanBelanjaSchema>

// Pencarian halaman laporan belanja (semua field opsional).
export const LaporanBelanjaSearchSchema = z.object({
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  supplierId: z.string().optional(),
  sumberBelanja: SumberBelanjaSchema.optional(),
})

export const FormatEksporBelanjaSchema = z.enum(['csv', 'xlsx', 'pdf'])

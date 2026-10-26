import { z } from 'zod'

export const PaginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
})

export const ArahUrutSchema = z.enum(['asc', 'desc']).default('asc')

// Query standar tabel server-side: pencarian, halaman, dan arah urut.
// Nilai dari URL selalu string, jadi take/skip memakai coerce.
export const TabelQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  take: z.coerce.number().int().min(1).max(100).default(10),
  skip: z.coerce.number().int().min(0).default(0),
  arah: ArahUrutSchema,
})

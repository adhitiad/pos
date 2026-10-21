import { z } from 'zod'

// ID Prisma memakai cuid(); validasi query param agar id ngawur → 400, bukan 500.
export const IdQuerySchema = z.object({ id: z.cuid() })

export const GrupIdQuerySchema = z.object({ grupId: z.cuid().optional() })

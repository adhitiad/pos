import { z } from 'zod'

// URL aset Cloudinary (secure_url) — dipakai untuk hapus & unduh via server.
export const AsetUrlSchema = z.object({
  url: z.string().url().max(500),
})

export const UnduhQuerySchema = z.object({
  url: z.string().url().max(500),
})

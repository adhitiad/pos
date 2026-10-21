import { z } from 'zod'

export const BahanInputSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(100),
  satuan: z.string().trim().min(1, 'Satuan wajib diisi').max(10),
  stok: z.number().nonnegative(),
  stokMinimum: z.number().nonnegative().default(0),
  hargaSatuan: z.number().nonnegative().default(0),
})

export const UpdateBahanSchema = BahanInputSchema.extend({
  id: z.string().min(1),
})

export const HapusBahanSchema = z.object({
  id: z.string().min(1),
})

export type BahanInput = z.infer<typeof BahanInputSchema>
export type UpdateBahanInput = z.infer<typeof UpdateBahanSchema>

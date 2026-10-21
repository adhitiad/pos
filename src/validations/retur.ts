import { z } from 'zod'

// Item yang dikembalikan dalam satu retur: produk + qty (snapshot harga
// diambil dari item transaksi asal di sisi server).
export const ReturItemInputSchema = z.object({
  produkId: z.string().min(1),
  qty: z.number().int().positive(),
})

// Buat retur pasca-jual. Referensi transaksi asal wajib; minimal 1 item
// dikembalikan; alasan wajib ditulis (jejak audit).
export const BuatReturSchema = z.object({
  transaksiId: z.string().min(1),
  alasan: z.string().min(1).max(500),
  items: z.array(ReturItemInputSchema).min(1, 'Minimal 1 item dikembalikan'),
})

export type BuatReturInput = z.infer<typeof BuatReturSchema>

// Riwayat retur: filter tanggal opsional.
export const DataReturSchema = z.object({
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type DataReturInput = z.infer<typeof DataReturSchema>

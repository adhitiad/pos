import { z } from 'zod'

// Item yang dikembalikan dalam satu retur: baris transaksi asal + qty.
// `transaksiItemId` adalah identitas baris; `produkId` dipertahankan sebagai
// alias lama (selama ini UI mengirim ID baris transaksi di field ini).
export const ReturItemInputSchema = z
  .object({
    transaksiItemId: z.string().min(1).optional(),
    produkId: z.string().min(1).optional(),
    qty: z.number().int().positive(),
  })
  .refine((v) => Boolean(v.transaksiItemId ?? v.produkId), {
    message: 'Item retur wajib menyertakan transaksiItemId atau produkId',
    path: ['transaksiItemId'],
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

// Detail transaksi asal untuk form retur.
export const DetailTransaksiSchema = z.object({ id: z.string().min(1) })

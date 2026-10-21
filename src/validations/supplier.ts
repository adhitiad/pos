import { z } from 'zod'

export const SupplierInputSchema = z.object({
  nama: z.string().trim().min(1, 'Nama supplier wajib diisi').max(100),
  kontak: z.string().trim().max(120).optional(),
  alamat: z.string().trim().max(200).optional(),
  catatan: z.string().trim().max(200).optional(),
  aktif: z.boolean().default(true),
})

export type SupplierInput = z.infer<typeof SupplierInputSchema>

export const UpdateSupplierSchema = SupplierInputSchema.extend({
  id: z.string().min(1),
})

export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>

export const HapusSupplierSchema = z.object({
  id: z.string().min(1),
})

// Ambil daftar hutang milik satu supplier.
export const SupplierIdSchema = z.object({
  supplierId: z.string().min(1),
})

// Pelunasan hutang usaha untuk satu pembelian bahan.
export const PembayaranHutangSchema = z.object({
  pembelianBahanId: z.string().min(1),
  jumlah: z.number().positive('Nominal pembayaran harus lebih dari 0'),
  catatan: z.string().trim().max(200).optional(),
})

export type PembayaranHutangInput = z.infer<typeof PembayaranHutangSchema>

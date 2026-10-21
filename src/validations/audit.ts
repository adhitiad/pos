import { z } from 'zod'

// Filter halaman/REST audit log. Semua opsional: tanpa filter tampilkan
// log terbaru.
export const AuditLogQuerySchema = z.object({
  entitas: z.string().max(50).optional(),
  aksi: z.string().max(80).optional(),
  aktorId: z.string().max(64).optional(),
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
})

export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>

// Daftar entitas & aksi yang dikenal — dipakai untuk mengisi dropdown filter
// dan sebagai daftar aksi audit yang sah.
export const ENTITAS_AUDIT = [
  'Produk',
  'Kategori',
  'Bahan',
  'Supplier',
  'PembelianBahan',
  'User',
  'Pengaturan',
] as const

export const AKSI_AUDIT = [
  'produk.ubah',
  'produk.hapus',
  'kategori.hapus',
  'bahan.ubah',
  'bahan.hapus',
  'supplier.ubah',
  'supplier.hapus',
  'supplier.hutang.bayar',
  'user.role.ubah',
  'pengaturan.ubah',
] as const

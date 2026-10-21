import { z } from 'zod'

// Sumber belanja bahan:
//   SUPPLIER      — ada supplier terdaftar (dipilih di form)
//   PASAR_ONLINE  — belanja ke marketplace online (belum ada supplier)
//   PASAR_OFFLINE — belanja ke pasar/toko fisik (belum ada supplier)
export const SumberBelanjaSchema = z.enum([
  'SUPPLIER',
  'PASAR_ONLINE',
  'PASAR_OFFLINE',
])

export type SumberBelanja = z.infer<typeof SumberBelanjaSchema>

export const PembelianBahanSchema = z
  .object({
    bahanId: z.string().min(1, 'Bahan wajib dipilih'),
    jumlah: z.number().positive('Jumlah harus lebih dari 0'),
    hargaSatuan: z.number().nonnegative('Harga satuan tidak boleh negatif'),
    catatan: z.string().max(200).optional(),
    supplierId: z.string().optional(),
    // Tandai pembelian sebagai hutang usaha (belum dibayar ke supplier).
    hutang: z.boolean().default(false),
    // Wajib diisi saat tidak ada supplier: menandai belanja ke pasar.
    sumberBelanja: SumberBelanjaSchema.default('SUPPLIER'),
    // Nama pasar/toko (opsional) — mis. "Pasar Kebayoran", "Tokopedia".
    tempatBelanja: z.string().trim().max(100).optional(),
  })
  .refine((v) => !v.hutang || !!v.supplierId, {
    message: 'Pilih supplier dulu untuk pembelian hutang',
    path: ['supplierId'],
  })
  .refine((v) => !!v.supplierId || v.sumberBelanja !== 'SUPPLIER', {
    message: 'Pilih sumber belanja (pasar online/offline) saat tanpa supplier',
    path: ['sumberBelanja'],
  })

// Tipe input: `hutang` & `sumberBelanja` boleh tidak diisi (default saat parse).
export type PembelianBahanInput = z.input<typeof PembelianBahanSchema>

export const PembelianBahanQuerySchema = z.object({
  bahanId: z.string().optional(),
  supplierId: z.string().optional(),
  sumberBelanja: SumberBelanjaSchema.optional(),
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type PembelianBahanQueryInput = z.infer<typeof PembelianBahanQuerySchema>

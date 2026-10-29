import { z } from 'zod'

export const BarisProdukSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(100),
  sku: z.string().trim().max(30).optional().nullable(),
  barcode: z.string().trim().max(50).optional().nullable(),
  gambar: z.string().trim().max(200).optional().nullable(),
  harga: z.coerce.number().int().min(0, 'Harga tidak boleh negatif'),
  stok: z.coerce.number().int().min(0, 'Stok tidak boleh negatif'),
  kategoriId: z.string().min(1).optional().nullable(),
  aktif: z.coerce.boolean().default(true),
})

export const ImporProdukDryRunSchema = z.object({
  csv: z
    .string()
    .min(1, 'CSV wajib diisi')
    .max(2 * 1024 * 1024),
  opsi: z.object({
    updateJikaAda: z.coerce.boolean().default(false),
  }),
})

export interface ImporBarisHasil {
  baris: number
  valid: boolean
  data?: z.infer<typeof BarisProdukSchema>
  errors: string[]
}

export interface ImporDryRunHasil {
  valid: number
  error: number
  total: number
  baris: ImporBarisHasil[]
  ringkasan: string
}

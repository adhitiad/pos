import { z } from 'zod'

import { TabelQuerySchema } from './pagination'

export const ProdukQuerySchema = TabelQuerySchema.extend({
  sort: z
    .enum(['nama', 'sku', 'harga', 'stok', 'aktif', 'kategori'])
    .default('nama'),
  status: z.enum(['semua', 'aktif', 'nonaktif']).default('semua'),
  kategoriId: z.string().max(64).optional(),
})

export type ProdukQueryInput = z.infer<typeof ProdukQuerySchema>

const ResepInputSchema = z.object({
  bahanId: z.string().min(1),
  jumlah: z.number().positive(),
})

export const ProdukInputSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(100),
  sku: z.string().trim().max(30).optional(),
  barcode: z.string().trim().max(50).optional(),
  gambar: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine(
      (v) => !v || v.startsWith('/') || v.startsWith('http'),
      'URL gambar tidak valid',
    ),
  harga: z.number().int().min(0, 'Harga tidak boleh negatif'),
  stok: z.number().int().min(0, 'Stok tidak boleh negatif'),
  kategoriId: z.string().min(1).optional(),
  aktif: z.boolean().default(true),
  resep: z.array(ResepInputSchema).default([]),
})

export const UpdateProdukSchema = ProdukInputSchema.extend({
  id: z.string().min(1),
})

export const KategoriInputSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(60),
  deskripsi: z.string().trim().max(200).optional(),
})

export const HapusProdukSchema = z.object({
  id: z.string().min(1),
})

export const ToggleProdukSchema = z.object({
  id: z.string().min(1),
  aktif: z.boolean(),
})

export const HapusKategoriSchema = z.object({
  id: z.string().min(1),
})

export type ProdukInput = z.infer<typeof ProdukInputSchema>
export type UpdateProdukInput = z.infer<typeof UpdateProdukSchema>
export type KategoriInput = z.infer<typeof KategoriInputSchema>

export const ProdukTerpopulerSchema = z
  .object({
    limit: z.coerce.number().int().positive().max(20).optional(),
  })
  // Tanpa argumen pun sah → `produkTerpopulerFn()` tak gagal saat loader.
  .default({})

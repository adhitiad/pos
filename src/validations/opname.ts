import { z } from 'zod'

// Satu baris koreksi opname: produk atau bahan (salah satu), stok tercatat
// dari sistem dan stok fisik yang dihitung di lapangan. Keberadaan id divalidasi di server layer.
export const OpnameItemInputSchema = z.object({
  jenis: z.enum(['PRODUK', 'BAHAN']),
  id: z.string().min(1),
  stokFisik: z.number().nonnegative(),
})

// Simpan hasil stok opname. Jenis wajib (PRODUK/BAHAN), minimal 1 item,
// catatan opsional. Selisih = stokFisik − stokTercatat dicatat per item.
export const SimpanOpnameSchema = z.object({
  jenis: z.enum(['PRODUK', 'BAHAN']),
  catatan: z.string().max(500).optional(),
  items: z.array(OpnameItemInputSchema).min(1, 'Minimal 1 item'),
})

export type SimpanOpnameInput = z.infer<typeof SimpanOpnameSchema>

// Riwayat opname: filter tanggal opsional.
export const DataOpnameSchema = z.object({
  jenis: z.enum(['PRODUK', 'BAHAN']).optional(),
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type DataOpnameInput = z.infer<typeof DataOpnameSchema>

// Query master aktif (produk/bahan) untuk form opname.
export const JenisMasterSchema = z.object({
  jenis: z.enum(['PRODUK', 'BAHAN']),
})

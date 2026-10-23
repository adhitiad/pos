import { z } from 'zod'

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/

// Batas atas nominal agar angka yang tidak wajar tidak pernah masuk jurnal.
const NOMINAL_MAX = 1_000_000_000

// Jenis akun pengeluaran. Nilai lowercase dipakai form (ringkas dibaca);
// pemetaan ke akun CoA & enum Prisma ada di `src/server/pengeluaranJenis.ts`.
export const JenisPengeluaranSchema = z.enum([
  'belanja',
  'operasional_kasir',
  'ambil_owner',
  'pembayaran_utang',
  'operasional_toko',
  'lainnya',
])

export type JenisPengeluaranKey = z.infer<typeof JenisPengeluaranSchema>

// Catat pengeluaran oleh owner: langsung menjadi jurnal buku besar.
export const PengeluaranSchema = z.object({
  tanggal: z.string().regex(TANGGAL),
  nominal: z.number().int().positive(),
  jenis: JenisPengeluaranSchema,
  keterangan: z.string().max(255).optional().default(''),
})

export type PengeluaranInput = z.infer<typeof PengeluaranSchema>

// Ajuan pengeluaran kasir: menunggu persetujuan owner, belum menyentuh jurnal.
export const AjuanPengeluaranSchema = z.object({
  nominal: z.number().int().positive().max(NOMINAL_MAX),
  jenis: JenisPengeluaranSchema,
  keterangan: z.string().trim().max(255).optional().default(''),
})

export type AjuanPengeluaranInput = z.input<typeof AjuanPengeluaranSchema>

// Persetujuan owner. `nominal` opsional: owner boleh menyetujui nominal
// lebih kecil dari ajuan (nilai kosong = setujui sesuai ajuan).
export const SetujuiPengajuanSchema = z.object({
  id: z.string().min(1),
  nominal: z.number().int().positive().max(NOMINAL_MAX).optional(),
})

export type SetujuiPengajuanInput = z.input<typeof SetujuiPengajuanSchema>

// Penolakan owner. Alasan opsional tapi tetap disimpan agar kasir tahu alasan.
export const TolakPengajuanSchema = z.object({
  id: z.string().min(1),
  alasan: z.string().trim().max(255).optional().default(''),
})

export type TolakPengajuanInput = z.input<typeof TolakPengajuanSchema>

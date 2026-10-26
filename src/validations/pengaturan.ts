import { z } from 'zod'

import { parsePersenPengaturan } from '#/lib/persen'
import { ID_UKURAN_KERTAS_TERMAL } from '#/lib/ukuran-kertas'

const KUNCI_PENGATURAN = [
  'mode_fnb',
  'riwayat_belanja_aktif',
  'nama_toko',
  'printer_escpos',
  'ukuran_kertas_termal',
  'struk_otomatis',
  'judul_app',
  'logo_url',
  'ikon_url',
  'deskripsi_app',
  'pajak_persen',
  'pajak_resto_persen',
  'pajak_retail_persen',
  'diskon_kasir_maks_persen',
  'stok_dikurangi_saat',
  'toko_aktif',
  'jam_buka',
  'jam_tutup',
  'review_transaksi_mode',
] as const

export const STRUK_OTOMATIS = ['nonaktif', 'cetak', 'pdf'] as const
export type StrukOtomatis = (typeof STRUK_OTOMATIS)[number]

export const KUNCI_PAJAK = [
  'pajak_persen',
  'pajak_resto_persen',
  'pajak_retail_persen',
] as const
export const MODE_FNB = ['true', 'false'] as const
export const STOK_DIKURANGI_SAAT = ['order', 'payment'] as const
export const MODE_REVIEW_TRANSAKSI = ['kasir', 'owner'] as const

// Payload pemilihan kebijakan review oleh owner.
export const SetModeReviewSchema = z.object({
  mode: z.enum(MODE_REVIEW_TRANSAKSI),
})

export const SetPengaturanSchema = z
  .object({
    kunci: z.enum(KUNCI_PENGATURAN),
    nilai: z.string().trim().max(200),
  })
  .refine(
    (v) =>
      !(KUNCI_PAJAK as readonly string[]).includes(v.kunci) ||
      parsePersenPengaturan(v.nilai) !== null,
    { message: 'Pajak harus angka 0–100', path: ['nilai'] },
  )
  .refine(
    (v) =>
      v.kunci !== 'mode_fnb' ||
      (MODE_FNB as readonly string[]).includes(v.nilai),
    { message: 'Mode F&B harus true atau false', path: ['nilai'] },
  )
  .refine(
    (v) =>
      v.kunci !== 'stok_dikurangi_saat' ||
      (STOK_DIKURANGI_SAAT as readonly string[]).includes(v.nilai),
    { message: 'Waktu pengurangan stok tidak valid', path: ['nilai'] },
  )
  .refine(
    (v) =>
      v.kunci !== 'struk_otomatis' ||
      (STRUK_OTOMATIS as readonly string[]).includes(v.nilai),
    { message: 'Nilai struk otomatis tidak valid', path: ['nilai'] },
  )
  .refine(
    (v) =>
      v.kunci !== 'ukuran_kertas_termal' ||
      (ID_UKURAN_KERTAS_TERMAL as readonly string[]).includes(v.nilai),
    { message: 'Ukuran kertas tidak valid', path: ['nilai'] },
  )
  .refine(
    (v) =>
      (v.kunci !== 'logo_url' && v.kunci !== 'ikon_url') ||
      v.nilai === '' ||
      v.nilai.startsWith('https://res.cloudinary.com/'),
    { message: 'URL aset harus dari Cloudinary', path: ['nilai'] },
  )
  .refine(
    (v) =>
      v.kunci !== 'diskon_kasir_maks_persen' ||
      (() => {
        if (v.nilai === '') return false
        const n = Number(v.nilai)
        return Number.isFinite(n) && n >= 0 && n <= 100
      })(),
    { message: 'Batas diskon kasir harus angka 0–100', path: ['nilai'] },
  )
  .refine(
    (v) =>
      v.kunci !== 'toko_aktif' ||
      (MODE_FNB as readonly string[]).includes(v.nilai),
    { message: 'Toko aktif harus true atau false', path: ['nilai'] },
  )
  .refine(
    (v) =>
      v.kunci !== 'review_transaksi_mode' ||
      (MODE_REVIEW_TRANSAKSI as readonly string[]).includes(v.nilai),
    { message: 'Mode review harus kasir atau owner', path: ['nilai'] },
  )
  .refine(
    (v) => {
      if (v.kunci !== 'jam_buka' && v.kunci !== 'jam_tutup') return true
      if (v.nilai === '') return true // kosong diizinkan (tidak dibatasi jam)
      return /^\d{2}:\d{2}$/.test(v.nilai)
    },
    {
      message: 'Jam buka/tutup harus format HH:MM (contoh 08:00)',
      path: ['nilai'],
    },
  )

export type SetPengaturanInput = z.infer<typeof SetPengaturanSchema>

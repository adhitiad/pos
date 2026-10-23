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
    (v) => {
      if (v.kunci !== 'diskon_kasir_maks_persen') return true
      if (v.nilai === '') return false
      const n = Number(v.nilai)
      return Number.isFinite(n) && n >= 0 && n <= 100
    },
    { message: 'Batas diskon kasir harus angka 0–100', path: ['nilai'] },
  )

export type SetPengaturanInput = z.infer<typeof SetPengaturanSchema>

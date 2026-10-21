import { z } from 'zod'

const KUNCI_PENGATURAN = [
  'mode_fnb',
  'riwayat_belanja_aktif',
  'nama_toko',
  'printer_escpos',
  'struk_otomatis',
  'judul_app',
  'logo_url',
  'ikon_url',
  'deskripsi_app',
  'pajak_persen',
  'pajak_resto_persen',
  'pajak_retail_persen',
  'stok_dikurangi_saat',
] as const

export const STRUK_OTOMATIS = ['nonaktif', 'cetak', 'pdf'] as const
export type StrukOtomatis = (typeof STRUK_OTOMATIS)[number]

export const SetPengaturanSchema = z
  .object({
    kunci: z.enum(KUNCI_PENGATURAN),
    nilai: z.string().trim().max(200),
  })
  .refine(
    (v) =>
      v.kunci !== 'struk_otomatis' ||
      (STRUK_OTOMATIS as readonly string[]).includes(v.nilai),
    { message: 'Nilai struk otomatis tidak valid', path: ['nilai'] },
  )
  .refine(
    (v) =>
      (v.kunci !== 'logo_url' && v.kunci !== 'ikon_url') ||
      v.nilai === '' ||
      v.nilai.startsWith('https://res.cloudinary.com/'),
    { message: 'URL aset harus dari Cloudinary', path: ['nilai'] },
  )

export type SetPengaturanInput = z.infer<typeof SetPengaturanSchema>

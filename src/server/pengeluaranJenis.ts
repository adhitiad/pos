import type { JenisPengeluaran as JenisEnum } from '#/generated/prisma/enums.js'
import type { JenisPengeluaranKey } from '#/validations/pengeluaran'

// Sumber kebenaran jenis pengeluaran: akun CoA yang di-debit, label untuk
// keterangan jurnal, dan nilai enum Prisma. Dipakai saat owner mencatat
// pengeluaran langsung maupun saat owner menyetujui ajuan kasir — agar
// keduanya selalu menghasilkan jurnal yang sama.
export const JENIS_PENGELUARAN = {
  belanja: { kodeAkun: '5200', label: 'Belanja', enum: 'BELANJA' },
  operasional_kasir: {
    kodeAkun: '5300',
    label: 'Operasional Kasir',
    enum: 'OPERASIONAL_KASIR',
  },
  ambil_owner: {
    kodeAkun: '3100',
    label: 'Ambil Owner',
    enum: 'AMBIL_OWNER',
  },
  pembayaran_utang: {
    kodeAkun: '2200',
    label: 'Pembayaran Utang',
    enum: 'PEMBAYARAN_UTANG',
  },
  operasional_toko: {
    kodeAkun: '5400',
    label: 'Operasional Toko',
    enum: 'OPERASIONAL_TOKO',
  },
  lainnya: { kodeAkun: '5900', label: 'Lainnya', enum: 'LAINNYA' },
} as const satisfies Record<
  JenisPengeluaranKey,
  { kodeAkun: string; label: string; enum: JenisEnum }
>

// Kunci CoA akun kas untuk sisi kredit jurnal (selalu saldo kas berkurang).
export const KODE_AKUN_KAS = '1100'

type MetaJenis = { kodeAkun: string; label: string; enum: JenisEnum }

const cariMeta = (jenis: string): MetaJenis | undefined =>
  (JENIS_PENGELUARAN as Record<string, MetaJenis | undefined>)[jenis]

// Label jenis untuk keterangan jurnal; teks polos karena disimpan di DB.
export function labelJenis(jenis: string): string {
  return cariMeta(jenis)?.label ?? 'Lainnya'
}

// Nilai enum Prisma dari kunci form (lowercase).
export function enumJenis(jenis: string): JenisEnum {
  return cariMeta(jenis)?.enum ?? 'LAINNYA'
}

// Kunci form (lowercase) dari nilai enum Prisma, dipakai saat membaca baris
// pengajuan yang tersimpan di DB.
export function kunciJenis(nilaiEnum: string): JenisPengeluaranKey | null {
  const found = Object.entries(JENIS_PENGELUARAN).find(
    ([, meta]) => meta.enum === nilaiEnum,
  )
  return (found?.[0] as JenisPengeluaranKey | undefined) ?? null
}

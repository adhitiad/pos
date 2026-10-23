// Pajak dibebankan ke pelanggan (harga eksklusif: ditambahkan di atas subtotal
// setelah diskon). Dua tarif terpisah, dipilih otomatis dari mode operasi:
//  - mode F&B (restoran/cafe) → PB1 (Pajak Barang dan Jasa tertentu / PBJT makanan-minuman)
//  - retail                    → PPN
// Semua nilai tetap dihitung ulang di server dari pengaturan; klien hanya pratinjau.
import type { TarifPajak } from '#/types/pajak'

export const KUNCI_PAJAK_RESTO = 'pajak_resto_persen'
export const KUNCI_PAJAK_RETAIL = 'pajak_retail_persen'
// Tarif tunggal lama (OW-10) — dipakai sebagai fallback bila kunci baru kosong.
export const KUNCI_PAJAK_LEGACY = 'pajak_persen'

export const KUNCI_PAJAK_SEMUA = [
  KUNCI_PAJAK_RESTO,
  KUNCI_PAJAK_RETAIL,
  KUNCI_PAJAK_LEGACY,
] as const

// Normalisasi tarif apa pun ke 0..100 (bilangan bulat persen, boleh pecahan).
export function normalisasiPersen(nilai: unknown): number {
  const n = Number(nilai ?? 0)
  if (!Number.isFinite(n)) return 0
  return Math.min(Math.max(0, n), 100)
}

// Ambil nilai tarif dari kunci baru; string kosong dianggap belum diisi dan
// jatuh ke `pajak_persen` (legacy). Ini mencegah data kosong diam-diam jadi 0.
export function pilihNilaiPajak(
  peta: Record<string, string | undefined>,
  kunci: string,
): string | undefined {
  const langsung = peta[kunci]
  if (langsung !== undefined && langsung.trim() !== '') return langsung
  const legacy = peta[KUNCI_PAJAK_LEGACY]
  return legacy !== undefined && legacy.trim() !== '' ? legacy : undefined
}

// Pilih tarif pajak aktif dari peta pengaturan berdasarkan mode F&B.
// Pure function supaya bisa diuji tanpa DB.
export function tarifPajak(
  peta: Record<string, string | undefined>,
  modeFnb: boolean,
): TarifPajak {
  const kunci = modeFnb ? KUNCI_PAJAK_RESTO : KUNCI_PAJAK_RETAIL
  return {
    persen: normalisasiPersen(pilihNilaiPajak(peta, kunci)),
    jenis: modeFnb ? 'PB1' : 'PPN',
  }
}

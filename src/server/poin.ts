// 1 poin untuk tiap kelipatan Rp10.000 nilai belanja
export const RUPIAH_PER_POIN = 10_000
// Nilai tukar: 1 poin = Rp100 diskon
export const POIN_NILAI_RUPIAH = 100

// Hitung poin yang benar-benar terpakai (dibulatkan ke bawah kelipatan
// Rp100) agar selalu pas dengan diskon yang diberikan. Pure function,
// diuji di tests/redeem.test.ts.
export function hitungRedeem(
  subtotal: number,
  diskon: number,
  tukarPoin: number,
) {
  const maksPoin = Math.floor((subtotal - diskon) / POIN_NILAI_RUPIAH)
  const poinTerpakai = Math.min(Math.max(0, tukarPoin), Math.max(0, maksPoin))
  return { poinTerpakai, diskonPoin: poinTerpakai * POIN_NILAI_RUPIAH }
}

// Diskon otomatis member (diskonPersen) atas sisa setelah diskon nominal manual.
// Poin tetap ditukarkan berdasarkan subtotal sebelum diskon member diterapkan.
export function hitungDiskonMember(
  subtotal: number,
  diskonManual: number,
  diskonPersen: number,
) {
  const base = Math.max(0, subtotal - diskonManual)
  return Math.max(0, Math.round((base * diskonPersen) / 100))
}

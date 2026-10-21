import type { InputTotal } from '#/types/kasir'

// 1 poin = Rp100 diskon (sama dengan POIN_NILAI_RUPIAH di server/transaksi.ts)
export const POIN_RUPIAH = 100

// Pajak dari tarif persen atas pokok setelah diskon manual & poin. Klien hanya
// menampilkan pratinjau; server tetap menghitung ulang (lihat postingHitung.ts).
export function hitungPajak(pokok: number, persen: number) {
  const tarif = Math.min(Math.max(0, persen), 100)
  return Math.max(0, Math.round((Math.max(0, pokok) * tarif) / 100))
}

// Diskon dibatasi subtotal; poin dibatasi saldo member & sisa nilai belanja.
// Dipakai RingkasanBayar dan validasi split di PanelBayar agar angkanya sama
// dengan perhitungan server.
export function hitungTotal(input: InputTotal) {
  const diskon = Math.min(Math.max(0, input.diskon), input.subtotal)
  const maksPoin = Math.floor((input.subtotal - diskon) / POIN_RUPIAH)
  const pakai = Math.max(
    0,
    Math.min(input.tukarPoin, input.memberPoin, maksPoin),
  )
  const pokok = input.subtotal - diskon - pakai * POIN_RUPIAH
  const pajak = hitungPajak(pokok, input.pajakPersen)
  const tarif = Math.max(0, input.tarif)
  const total = pokok + pajak + tarif
  return { diskon, pakai, pajak, total }
}

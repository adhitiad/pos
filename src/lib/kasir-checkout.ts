import type { BarisBayar, MetodeBayar } from '#/types/kasir'

// Nilai sentinel untuk Select tipe pesanan. Bukan id `Delivery`, jadi tidak
// boleh dikirim mentah ke server: konversi ke `undefined` lewat
// `idDeliveryDariTipePesanan` sebelum payload dibuat.
export const TIPE_PESANAN_DINE_IN = 'DINE_IN'
export const TIPE_PESANAN_PICKUP = 'PICKUP'

export function idDeliveryDariTipePesanan(nilai: string): string | undefined {
  if (
    !nilai ||
    nilai === TIPE_PESANAN_DINE_IN ||
    nilai === TIPE_PESANAN_PICKUP
  ) {
    return undefined
  }
  return nilai
}

export type AlasanBelumSiapBayar = 'kosong' | 'tipe_pesanan' | 'tunai' | 'split'

// Satu sumber aturan tombol Bayar (dipakai PanelBayar untuk disabled dan
// useFormKasir untuk menolak submit lewat Enter). Urutan alasan = prioritas
// pesan yang ditampilkan.
export function cekSiapBayar(input: {
  jumlahItem: number
  tipePesanan: string
  total: number
  split: boolean
  metode: MetodeBayar
  uangDiterima: number
  baris: Pick<BarisBayar, 'jumlah'>[]
}): AlasanBelumSiapBayar | null {
  if (input.jumlahItem <= 0) return 'kosong'
  if (!input.tipePesanan) return 'tipe_pesanan'

  if (input.split) {
    const dibayar = input.baris.reduce((s, b) => s + (Number(b.jumlah) || 0), 0)
    const adaBaris = input.baris.some((b) => (Number(b.jumlah) || 0) > 0)
    return adaBaris && dibayar === input.total ? null : 'split'
  }

  // Tunai wajib mencatat uang diterima; non-tunai tidak butuh nominal.
  if (input.metode === 'TUNAI' && input.uangDiterima < input.total) {
    return 'tunai'
  }

  return null
}

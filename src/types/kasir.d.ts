import type { kasirData } from '#/server/kasir'
import type { CartModifier } from '#/types/kasir-store'
import type { MetodeBayar } from '#/types/transaksi'

export type { MetodeBayar }

export type DataKasir = Awaited<ReturnType<typeof kasirData>>
export type ProdukKasir = DataKasir['produk'][number]

// Satu baris di keranjang kasir (produk + qty + modifier terpilih).
export interface BarisKeranjang {
  produk: ProdukKasir
  qty: number
  modifiers: CartModifier[]
}

// Meja ringkas untuk dropdown pemilihan meja di kasir.
export interface MejaRingkas {
  id: string
  nomor: string
  nama: string | null
}

// Input perhitungan total di klien (hitungTotal).
export interface InputTotal {
  subtotal: number
  diskon: number
  pajakPersen: number
  tukarPoin: number
  memberPoin: number
  tarif: number
}

// Satu baris pembayaran split di panel kasir.
export interface BarisBayar {
  key: string
  metode: MetodeBayar
  jumlah: number
}

// Subset nilai form yang dibutuhkan ringkasan bayar.
export interface NilaiRingkasan {
  diskon: number
  tukarPoin: number
  memberId: string
}

export interface GrupModifier {
  id: string
  nama: string
  wajib: boolean
  min: number
  max: number
  modifiers: {
    id: string
    nama: string
    hargaTambahan: number
    aktif: boolean
  }[]
}

export interface StrukItem {
  nama: string
  qty: number
  harga: number
}

export interface StrukPembayaran {
  metode: string
  jumlah: number
  uangDiterima: number | null
}

export interface Struk {
  nomor: string
  tanggal: string
  subtotal: number
  diskon: number
  diskonMember: number
  pajak: number
  pajakJenis: string | null
  ongkir: number
  total: number
  metodeBayar: string
  uangDiterima: number | null
  kembalian: number | null
  pembayaran: StrukPembayaran[]
  itemCount: number
  items: StrukItem[]
  jurnalNomor: string
  memberNama: string | null
  memberTier: string | null
  cetakOwner: number
  cetakKasir: number
  transaksiId: string
}

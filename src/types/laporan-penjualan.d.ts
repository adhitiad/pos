import type { Grup } from '#/validations/laporan-penjualan'

export interface BarisTransaksi {
  tanggal: Date
  subtotal: number
  diskon: number
  pajak: number
  ongkir: number
  total: number
  hpp: number
}

export interface RekapRow {
  periode: string
  jumlahTransaksi: number
  omzet: number
  hpp: number
  labaKotor: number
  total: number
}

export interface Ringkasan {
  jumlahTransaksi: number
  subtotal: number
  diskon: number
  pajak: number
  ongkir: number
  total: number
  omzet: number
  hpp: number
  labaKotor: number
}

export interface ProdukTerlaris {
  produkId: string | null
  nama: string
  qty: number
  omzet: number
}

export interface PerformaKasir {
  kasirId: string | null
  nama: string
  jumlahTransaksi: number
  omzet: number
}

export interface LaporanPenjualan {
  dari: string
  sampai: string
  grup: Grup
  ringkasan: Ringkasan
  rekap: RekapRow[]
  produkTerlaris: ProdukTerlaris[]
  performaKasir: PerformaKasir[]
}

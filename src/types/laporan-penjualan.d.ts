import type { Grup, Dimensi } from '#/validations/laporan-penjualan'

export interface BarisTransaksi {
  tanggal: Date
  subtotal: number
  diskon: number
  pajak: number
  ongkir: number
  total: number
  hpp: number
  qtyTerjual: number
  kategoriId: string | null
  kategoriNama: string | null
  kasirId: string | null
  shiftId: string | null
  memberId: string | null
  metodeBayar: string
  mejaId: string | null
  deliveryId: string | null
  sumber: string
  statusPesanan: string
  pajakJenis: string | null
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
  qtyTerjual: number
  subtotal: number
  diskon: number
  pajak: number
  ongkir: number
  total: number
  omzet: number
  hpp: number
  labaKotor: number
  poinTerpakai: number
  poinDapat: number
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

export interface RekapDimensi {
  dimensi: Dimensi
  kunci: string
  label: string
  jumlahTransaksi: number
  omzet: number
  total: number
}

export interface LaporanPenjualan {
  dari: string
  sampai: string
  grup: Grup
  dimensi?: Dimensi
  ringkasan: Ringkasan
  rekap: RekapRow[]
  rekapDimensi?: RekapDimensi[]
  produkTerlaris: ProdukTerlaris[]
  performaKasir: PerformaKasir[]
}

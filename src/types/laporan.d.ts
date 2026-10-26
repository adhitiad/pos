import type { Grup } from '#/validations/laporan-pajak'
import type { SumberBelanja } from '#/validations/pembelian-bahan'

export interface NilaiFilterLaporan {
  dari: string
  sampai: string
  grup: string
  userType: string | undefined
}

export interface LaporanBelanjaOutput {
  dari: string
  sampai: string
  /** Total nilai pembelian bahan pada periode. */
  totalBelanja: number
  jumlahPembelian: number
  /** Sisa hutang usaha yang belum dibayar (dari pembelian periode ini). */
  totalHutang: number
  /** Rekap per sumber belanja: supplier terdaftar atau pasar online/offline. */
  perSumber: {
    /** Id supplier (null untuk pembelian pasar). */
    supplierId: string | null
    sumberBelanja: SumberBelanja
    nama: string
    jumlah: number
    total: number
    hutang: number
  }[]
  perBulan: { periode: string; total: number }[]
  detail: {
    id: string
    tanggal: string
    sumberBelanja: SumberBelanja
    /** Nama supplier (bila ada). */
    supplierNama: string | null
    /** Nama pasar/toko (bila pembelian ke pasar). */
    tempatBelanja: string | null
    bahanNama: string
    jumlah: number
    hargaSatuan: number
    totalHarga: number
    belumDibayar: number
    catatan: string | null
  }[]
}

export interface LaporanPajakOutput {
  dari: string
  sampai: string
  grup: Grup
  totalPerJenis: {
    jenis: string
    jumlahTransaksi: number
    pajak: number
    total: number
    subtotal: number
  }[]
  riwayat: {
    periode: string
    jenis: {
      jenis: string
      pajak: number
    }[]
  }[]
}

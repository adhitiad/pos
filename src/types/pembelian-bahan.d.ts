import type { SumberBelanja } from '#/validations/pembelian-bahan'

export interface PembelianBahanRow {
  id: string
  bahanNama: string
  jumlah: number
  hargaSatuan: number
  totalHarga: number
  tanggal: string
  catatan: string | null
  /** Id supplier bila pembelian dicatat dengan supplier. */
  supplierId: string | null
  supplierNama: string | null
  /** Sisa hutang usaha untuk pembelian ini (0 = lunas). */
  belumDibayar: number
  /** Sumber belanja: supplier terdaftar atau pasar online/offline. */
  sumberBelanja: SumberBelanja
  /** Nama pasar/toko (hanya untuk pembelian pasar). */
  tempatBelanja: string | null
}

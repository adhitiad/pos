import type { bahanData } from '#/server/bahan'
import type { SumberBelanja } from '#/validations/pembelian-bahan'

export type BahanRow = Awaited<ReturnType<typeof bahanData>>[number]

// Nilai form tambah/edit bahan (stok & harga sebagai number).
export interface NilaiFormBahan {
  nama: string
  satuan: string
  jenis: string
  stok: number
  stokMinimum: number
  hargaSatuan: number
}

// Muatan kirim ke server (jenis opsional karena skema server mengabaikannya).
export interface MuatanBahan {
  nama: string
  satuan: string
  jenis?: string
  stok: number
  stokMinimum: number
  hargaSatuan: number
}

// Nilai form pembelian bahan (tambah stok).
export interface NilaiPembelianBahan {
  jumlah: number
  hargaSatuan: number
  catatan?: string
  /** Id supplier pembelian (opsional). */
  supplierId?: string
  /** Tandai pembelian sebagai hutang usaha (belum dibayar ke supplier). */
  hutang: boolean
  /** Sumber belanja: supplier, pasar online, atau pasar offline. */
  sumberBelanja: SumberBelanja
  /** Nama pasar/toko (hanya untuk pembelian tanpa supplier). */
  tempatBelanja?: string
}

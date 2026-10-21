export interface SupplierRow {
  id: string
  nama: string
  kontak: string | null
  alamat: string | null
  catatan: string | null
  aktif: boolean
  /** Berapa kali supplier dipakai pada pembelian bahan. */
  jumlahPembelian: number
  /** Total nilai pembelian dari supplier ini (semua periode). */
  totalBelanja: number
  /** Sisa hutang usaha yang belum dibayar ke supplier ini. */
  hutang: number
}

export interface SupplierOpsi {
  id: string
  nama: string
}

/** Satu pembelian bahan yang masih punya sisa hutang. */
export interface HutangPembelianRow {
  pembelianBahanId: string
  tanggal: string
  bahanNama: string
  totalHarga: number
  belumDibayar: number
}

export interface NilaiFormSupplier {
  nama: string
  kontak: string
  alamat: string
  catatan: string
  aktif: boolean
}

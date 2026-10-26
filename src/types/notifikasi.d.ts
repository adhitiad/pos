import type { Role } from '#/generated/prisma/enums.js'

export type TipeNotifikasi = 'PENGAJUAN' | 'SETUJUI' | 'TOLAK' | 'INFO'

/** Pesan notifikasi antar pengguna sebelum disimpan ke DB. */
export type PesanNotifikasi = {
  tipe: TipeNotifikasi
  judul: string
  pesan: string
  entitasId?: string | null
}

export type NotifikasiStok = {
  id: string
  tipe: 'stok'
  nama: string
  stok: number
  satuan: string
  stokMinimum: number
  tanggal: string
}

export type PeriodePendapatan = 'harian' | 'mingguan' | 'bulanan'

export type NotifikasiPendapatan = {
  id: string
  tipe: 'pendapatan'
  periode: PeriodePendapatan
  dari: string
  sampai: string
  total: number
  jumlahTransaksi: number
  tanggal: string
}

export type NotifikasiTransaksi = {
  id: string
  tipe: 'transaksi'
  nomor: string
  total: number
  poinDapat: number
  tanggal: string
}

export type StatusPesananNotif =
  'MENUNGGU' | 'DIPROSES' | 'SELESAI' | 'DIBATALKAN' | 'LUNAS'

export type NotifikasiPesanan = {
  id: string
  tipe: 'pesanan'
  untuk: 'kasir' | 'member'
  nomor: string
  total: number
  status: StatusPesananNotif
  jumlahItem: number
  meja: string | null
  pelanggan: string | null
  tanggal: string
}

// Notifikasi antar pengguna (pengajuan pengeluaran kasir ↔ owner) yang
// disimpan di DB. `kategori` menentukan judul, `pesan` isi detail (nominal).
export type NotifikasiPengajuan = {
  id: string
  tipe: 'pengajuan'
  kategori: TipeNotifikasi
  judul: string
  pesan: string
  entitasId: string | null
  tanggal: string
}

export type Notifikasi =
  | NotifikasiStok
  | NotifikasiPendapatan
  | NotifikasiTransaksi
  | NotifikasiPesanan
  | NotifikasiPengajuan

export interface PeriodeNotifikasi {
  awal: Date
  akhir: Date
  labelDari: string
  labelSampai: string
}

export interface OpsiNotifikasi {
  role: Role
  email: string
  // Wajib untuk notifikasi antar pengguna (pengajuan); bila kosong, notifikasi
  // DB dilewati (mis. pemanggilan tanpa sesi pengguna).
  userId?: string
}

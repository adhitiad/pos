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

export type Notifikasi =
  | NotifikasiStok
  | NotifikasiPendapatan
  | NotifikasiTransaksi
  | NotifikasiPesanan

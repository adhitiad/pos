import type { GrupKunjungan } from '#/validations/kunjungan'

export interface BarisKunjungan {
  tanggal: string
  jumlahKunjungan: number
  jumlahPenggunaUnik: number
  perUserType: { userType: string; jumlah: number }[]
}

export interface RingkasanKunjungan {
  totalKunjungan: number
  totalPenggunaUnik: number
  rataRataPerHari: number
  perUserType: { userType: string; jumlah: number }[]
  perKlasifikasi: { klasifikasi: string; jumlah: number }[]
  perOS: { os: string; jumlah: number }[]
}

export interface DataKunjungan {
  dari: string
  sampai: string
  grup: GrupKunjungan
  ringkasan: RingkasanKunjungan
  deret: BarisKunjungan[]
  halamanTerpopuler: { path: string; jumlah: number }[]
}

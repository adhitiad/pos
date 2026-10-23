// Bentuk ajuan pengeluaran yang dikirim server ke klien (semua nominal
// sudah berupa angka, bukan Decimal Prisma).
export type StatusPengajuanUi = 'PENDING' | 'DISETUJUI' | 'DITOLAK'

export type PengajuanRingkas = {
  id: string
  kasirId: string
  kasirNama: string
  nominal: number
  nominalDisetujui: number | null
  jenis: string
  jenisLabel: string
  keterangan: string | null
  status: StatusPengajuanUi
  alasanPenolakan: string | null
  jurnalNomor: string | null
  createdAt: string
  disetujuiPada: string | null
  ditolakPada: string | null
}

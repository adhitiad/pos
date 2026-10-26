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

// Kontrak jurnal yang dikembalikan pemanggil (Decimal → number agar bisa
// diserialisasi server function tanpa kehilangan presisi rupiah).
export type JurnalPengeluaran = {
  id: string
  nomor: string
  tanggal: string
  keterangan: string | null
  entri: {
    id: string
    akunId: string
    akunKode: string
    akunNama: string
    debit: number
    kredit: number
    keterangan: string | null
  }[]
}

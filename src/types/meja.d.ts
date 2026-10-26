export type Meja = {
  id: string
  nomor: string
  nama: string | null
  aktif: boolean
  jumlahTransaksi: number
  aktifDiAntrean?: {
    id: string
    nomor: string
    statusPesanan: string
  } | null
}

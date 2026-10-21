export interface PrinterRow {
  id: string
  userId: string | null
  nama: string
  tipe: string
  lokasi: string | null
  perangkat: string | null
  koneksi: string
  vendorId: string | null
  vendorName: string | null
  serialNumber: string | null
  productName: string | null
  dipindaiPada: string | null
  default: boolean
  aktif: boolean
}

/** Nilai form tambah/edit printer. */
export interface NilaiFormPrinter {
  nama: string
  tipe: string
  lokasi: string
  perangkat: string
  koneksi: string
  default: boolean
  aktif: boolean
}

export interface PrintJobRow {
  id: string
  printerId: string | null
  printerNama: string | null
  transaksiId: string | null
  tipe: string
  status: string
  percobaan: number
  pesanGalat: string | null
  dicetakPada: string | null
  diambilPada: string | null
  createdAt: string
  /** Isi struk siap render (client pencetak yang mengubahnya jadi ESC/POS). */
  payload: StrukPayload | null
}

/** Data struk yang dikirim ke client pencetak. */
export interface StrukPayload {
  nomor: string
  tanggal: string
  items: {
    nama: string
    qty: number
    harga: number
    subtotal: number
    modifier: {
      nama: string
      qty: number
      tambahan: number
      catatan: string | null
    }[]
  }[]
  subtotal: number
  diskon: number
  pajak: number
  pajakJenis: string | null
  ongkir: number
  total: number
  metodeBayar: string
  pembayaran: { metode: string; jumlah: number }[]
  uangDiterima: number | null
  kembalian: number | null
  memberNama: string | null
  catatan: string | null
}

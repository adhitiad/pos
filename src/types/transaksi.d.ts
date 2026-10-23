import type { METODE_BAYAR } from '#/validations/transaksi'

export type MetodeBayar = (typeof METODE_BAYAR)[number]

export interface ProdukHitungResep {
  bahanId: string
  jumlah: { toNumber: () => number }
  bahan: {
    nama: string
    stok: { toNumber: () => number }
    hargaSatuan: { toNumber: () => number }
  }
}

export interface ProdukHitung {
  id: string
  nama: string
  aktif: boolean
  stok: number
  harga: { toNumber: () => number }
  resep: ProdukHitungResep[]
  produkModifierGrup: {
    grup: {
      id: string
      nama: string
      wajib: boolean
      min: number
      max: number
      modifiers: { id: string; hargaTambahan: { toNumber: () => number } }[]
    }
  }[]
}

export interface ItemHitungModifier {
  modifierId: string
  qty: number
  catatan?: string
}

export interface ItemHitung {
  produkId: string
  qty: number
  modifiers?: ItemHitungModifier[]
}

export interface KebutuhanBahan {
  bahanId: string
  nama: string
  butuh: number
}

export interface BarisHitung {
  produkId: string
  namaProduk: string
  harga: number
  qty: number
  subtotal: number
  hpp: number
  kebutuhan: KebutuhanBahan[]
  modifiers: ItemHitungModifier[]
}

export interface PembayaranMasuk {
  metode: MetodeBayar
  jumlah: number
  uangDiterima?: number
}

export interface BarisBayar {
  metode: MetodeBayar
  jumlah: number
  uangDiterima: number | null
}

export interface HasilPembayaran {
  barisBayar: BarisBayar[]
  uangDiterimaTotal: number | null
  kembalian: number
  metodeUtama: MetodeBayar
}

export interface EntriJurnal {
  akunId: string
  debit: number
  kredit: number
}

// Bentuk hasil `postingTransaksi` yang diringkas ke klien.
export interface HasilTransaksiRingkas {
  transaksi: {
    id: string
    nomor: string
    tanggal: Date
    subtotal: { toNumber: () => number }
    diskon: { toNumber: () => number }
    pajak: { toNumber: () => number }
    pajakJenis: string | null
    ongkir: { toNumber: () => number }
    total: { toNumber: () => number }
    metodeBayar: string
    mejaId: string | null
    statusPesanan: string
    uangDiterima: { toNumber: () => number } | null
    kembalian: { toNumber: () => number } | null
    cetakOwner: number | null
    cetakKasir: number | null
    items: {
      namaProduk: string
      qty: number
      harga: { toNumber: () => number }
      modifiers?: {
        modifier: { nama: string; hargaTambahan: { toNumber: () => number } }
        qty: number
        catatan: string | null
        hargaTambahan: { toNumber: () => number }
      }[]
    }[]
    pembayaran: {
      metode: string
      jumlah: { toNumber: () => number }
      uangDiterima: { toNumber: () => number } | null
    }[]
  }
  jurnal: { id: string; nomor: string } | null
  hpp: number
  diskonMember: number
  memberInfo?: { nama: string; totalBelanja: number; tier: string } | null
  /** True bila respons ini hasil replay idempoten (transaksi sudah ada). */
  replay?: boolean
}

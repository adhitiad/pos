export type PesananProduk = {
  id: string
  nama: string
  gambar: string | null
  harga: number
  stok: number
  kategoriNama: string | null
  modifierGrup: PesananModifierGrub[]
}

export type PesananModifierGrub = {
  id: string
  nama: string
  wajib: boolean
  min: number
  max: number
  modifiers: PesananModifier[]
}

export type PesananModifier = {
  id: string
  nama: string
  hargaTambahan: number
  aktif: boolean
}

export type Meja = {
  id: string
  nomor: string
  nama: string | null
}

export type PesananItem = {
  produkId: string
  nama: string
  harga: number
  qty: number
  modifiers: PesananModifierPilihan[]
}

export type PesananModifierPilihan = {
  modifierId: string
  qty: number
  catatan: string
}

export type ModePesanan = 'DINE_IN' | 'TAKE_AWAY'

export type MetodeBayarOnline = 'QRIS' | 'TRANSFER' | 'EWALLET'

export interface CheckoutProps {
  mode: ModePesanan
  mejaId: string
  namaPelanggan: string
  pembayaran: MetodeBayarOnline
  daftarMeja: Meja[]
  total: number
  pending: boolean
  onModeChange: (mode: ModePesanan) => void
  onMejaChange: (id: string) => void
  onNamaChange: (v: string) => void
  onPembayaranChange: (m: MetodeBayarOnline) => void
  onCheckout: () => void
}

export interface KeranjangProps {
  items: PesananItem[]
  onTambah: (produkId: string) => void
  onKurang: (produkId: string) => void
  onHapus: (produkId: string) => void
}

export interface ProdukItemProps {
  produk: PesananProduk
  qty: number
  habis: boolean
  onTambah: () => void
  onKurang: () => void
}

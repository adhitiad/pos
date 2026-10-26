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

export type Delivery = {
  id: string
  nama: string
  tarif: number
  estimasi: string | null
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

export type ModePesanan = 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY'

export type MetodeBayarOnline = 'QRIS' | 'TRANSFER' | 'EWALLET'

// Member yang sedang login di halaman pemesanan publik.
export type MemberSaya = {
  id: string
  nama: string
  alamat: string | null
  poin: number
  diskonPersen: number | null
}

export type PesananOpsi = {
  mejaTokenAwal?: string
  tokoBuka?: boolean
  tokoAlasan?: string
}

export interface CheckoutProps {
  mode: ModePesanan
  mejaNomor: string | null
  namaPelanggan: string
  pembayaran: MetodeBayarOnline
  deliveryId: string
  daftarDelivery: Delivery[]
  alamat: string
  subtotal: number
  ongkir: number
  total: number
  pending: boolean
  onModeChange: (mode: ModePesanan) => void
  onNamaChange: (v: string) => void
  onPembayaranChange: (m: MetodeBayarOnline) => void
  onDeliveryChange: (id: string) => void
  onAlamatChange: (v: string) => void
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

export type InputKonfirmasiPembayaran = {
  id: string
  via: 'MANUAL' | 'WEBHOOK'
  paymentRef?: string
  jumlahDibayar?: number
}

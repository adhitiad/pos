// Parameter audit saat KASIR mencoba diskon melebihi batasnya.
export interface DetailDiskonDitolak {
  aktorId: string | null
  peran: string
  subtotal: number
  diskonDiminta: number
  batasDiskon: number
  persenBatas: number
}

// Parameter audit diskon OWNER di atas ambang kasir.
export interface DetailDiskonOwner {
  aktorId: string | null
  transaksiId: string
  nomor: string
  subtotal: number
  diskon: number
  batasDiskon: number
  persenBatas: number
}

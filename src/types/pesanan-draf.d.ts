// Bentuk data pesanan draft yang dikirim server function ke UI kasir.

export type DraftItemModifier = {
  modifierId: string
  modifierNama: string
  qty: number
  catatan: string | null
  hargaTambahan: number
}

export type DraftItemDetail = {
  produkId: string
  namaProduk: string
  harga: number
  qty: number
  modifiers: DraftItemModifier[]
  subtotal: number
}

/** Bentuk items JSON yang disimpan di kolom draft. */
export type DraftItemJson = {
  produkId: string
  namaProduk: string
  harga: number
  qty: number
  modifiers: DraftItemModifier[]
}

export type PesananDrafRingkas = {
  id: string
  mejaId: string | null
  mejaNomor: string | null
  memberId: string | null
  memberNama: string | null
  memberTier: string | null
  memberPoin: number | null
  nama: string | null
  telepon: string | null
  catatan: string | null
  status: string
  itemCount: number
  subtotal: number
  dibuatPada: string
}

export type PesananDrafDetail = PesananDrafRingkas & {
  items: DraftItemDetail[]
}

import { Store } from '@tanstack/store'

import type { CartItem, CartModifier } from '#/types/kasir-store'

export { type CartItem, type CartModifier }

// Keranjang: produkId -> item (qty + pilihan modifier).
// Tipe `Partial` jujur: produk yang belum ada di keranjang memang `undefined`
// (sebelumnya `Record` bohong → `cart[id].qty` lolos typecheck lalu crash).
export const cartStore = new Store<Partial<Record<string, CartItem>>>({})

export function cartSetQty(
  produkId: string,
  qty: number,
  modifiers: CartModifier[] = [],
) {
  cartStore.setState((s) => {
    const next = { ...s }
    const existing = next[produkId]
    if (qty <= 0) {
      delete next[produkId]
    } else if (existing) {
      next[produkId] = { ...existing, qty }
    } else {
      next[produkId] = { qty, modifiers }
    }
    return next
  })
}

// Tambah 1 ke produk di keranjang (pilihan modifier ditambahkan saat baru).
export function cartIncrement(
  produkId: string,
  modifiers: CartModifier[] = [],
) {
  cartStore.setState((s) => {
    const next = { ...s }
    const existing = next[produkId]
    if (existing) {
      next[produkId] = { ...existing, qty: existing.qty + 1 }
    } else {
      next[produkId] = { qty: 1, modifiers }
    }
    return next
  })
}

export function cartClear() {
  cartStore.setState(() => ({}))
}

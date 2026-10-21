import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import { cartClear, cartStore } from '#/lib/kasir-store'
import ProdukGrid from '#/components/kasir/ProdukGrid'
import type { DataKasir } from '#/types/kasir'

// Fixture minimum untuk grid kasir: produk tanpa modifier & tanpa resep.
const data = {
  produk: [
    {
      id: 'p1',
      nama: 'Kopi Susu',
      sku: 'KOP-1',
      barcode: null,
      gambar: null,
      harga: 15000,
      stok: 10,
      kategoriId: 'k1',
      kategori: { nama: 'Minuman' },
      resep: [],
      modifierGrup: [],
    },
  ],
  kategori: [{ id: 'k1', nama: 'Minuman' }],
} as unknown as DataKasir

afterEach(() => {
  cartClear()
})

describe('ProdukGrid — render aman', () => {
  it('keranjang kosong → produk tampil, tak crash', () => {
    // Regresi: `cart[p.id].qty` melempar error saat produk belum ada di
    // keranjang (halaman /kasir blank karena crash).
    const html = renderToStaticMarkup(<ProdukGrid data={data} />)
    expect(html).toContain('Kopi Susu')
    expect(html).toContain('Rp15.000')
  })

  it('produk ada di keranjang → badge qty tampil', () => {
    cartStore.setState(() => ({ p1: { qty: 3, modifiers: [] } }))
    const html = renderToStaticMarkup(<ProdukGrid data={data} />)
    expect(html).toContain('Kopi Susu')
  })
})

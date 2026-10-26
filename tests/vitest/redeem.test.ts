import { describe, expect, it } from 'vitest'

import { POIN_NILAI_RUPIAH, hitungRedeem } from '#/server/transaksi'
import { PostingTransaksiSchema } from '#/validations/transaksi'

describe('hitungRedeem', () => {
  it('memakai poin sesuai permintaan bila cukup', () => {
    // subtotal 15000 → maks 150 poin; tukar 50 → terpakai 50 = Rp5000
    expect(hitungRedeem(15000, 0, 50)).toEqual({
      poinTerpakai: 50,
      diskonPoin: 5000,
    })
  })

  it('dibatasi sisa setelah diskon nominal', () => {
    // subtotal 40000 diskon 2000 → sisa 38000 → maks 380 poin
    expect(hitungRedeem(40000, 2000, 500)).toEqual({
      poinTerpakai: 380,
      diskonPoin: 38000,
    })
  })

  it('nol bila tidak tukar atau subtotal habis oleh diskon', () => {
    expect(hitungRedeem(15000, 0, 0)).toEqual({
      poinTerpakai: 0,
      diskonPoin: 0,
    })
    expect(hitungRedeem(5000, 5000, 10)).toEqual({
      poinTerpakai: 0,
      diskonPoin: 0,
    })
  })

  it('diskon poin selalu kelipatan Rp100', () => {
    const { diskonPoin } = hitungRedeem(15550, 0, 200)
    expect(diskonPoin % POIN_NILAI_RUPIAH).toBe(0)
  })
})

describe('PostingTransaksiSchema', () => {
  it('menolak keranjang kosong', () => {
    expect(() =>
      PostingTransaksiSchema.parse({
        items: [],
      }),
    ).toThrow()
  })

  it('menolak qty nol/negatif dan diskon negatif', () => {
    expect(() =>
      PostingTransaksiSchema.parse({
        items: [{ produkId: 'x', qty: 0 }],
      }),
    ).toThrow()
    expect(() =>
      PostingTransaksiSchema.parse({
        items: [{ produkId: 'x', qty: 1 }],
        diskon: -1,
      }),
    ).toThrow()
  })

  it('menerima input minimal yang valid', () => {
    const hasil = PostingTransaksiSchema.parse({
      items: [{ produkId: 'x', qty: 2 }],
    })
    expect(hasil).toMatchObject({
      diskon: 0,
      pajak: 0,
      tukarPoin: 0,
      metodeBayar: 'TUNAI',
    })
  })
})

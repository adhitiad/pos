import { describe, expect, it } from 'vitest'

import {
  cekSiapBayar,
  idDeliveryDariTipePesanan,
  TIPE_PESANAN_DINE_IN,
  TIPE_PESANAN_PICKUP,
} from '../../src/lib/kasir-checkout.js'

const dasar = {
  jumlahItem: 2,
  tipePesanan: TIPE_PESANAN_DINE_IN,
  total: 50000,
  split: false,
  metode: 'TUNAI' as const,
  uangDiterima: 50000,
  baris: [{ jumlah: 0 }],
}

describe('idDeliveryDariTipePesanan', () => {
  it('sentinel dine-in/pickup dan nilai kosong tidak dikirim sebagai deliveryId', () => {
    expect(idDeliveryDariTipePesanan(TIPE_PESANAN_DINE_IN)).toBeUndefined()
    expect(idDeliveryDariTipePesanan(TIPE_PESANAN_PICKUP)).toBeUndefined()
    expect(idDeliveryDariTipePesanan('')).toBeUndefined()
  })

  it('id Delivery asli diteruskan apa adanya', () => {
    expect(idDeliveryDariTipePesanan('delivery-123')).toBe('delivery-123')
  })
})

describe('cekSiapBayar', () => {
  it('siap bila tunai menutup total dan tipe pesanan dipilih', () => {
    expect(cekSiapBayar(dasar)).toBeNull()
  })

  it('menolak keranjang kosong', () => {
    expect(cekSiapBayar({ ...dasar, jumlahItem: 0 })).toBe('kosong')
  })

  it('menolak sebelum tipe pesanan dipilih', () => {
    expect(cekSiapBayar({ ...dasar, tipePesanan: '' })).toBe('tipe_pesanan')
  })

  it('tunai kurang dari total belum boleh dibayar', () => {
    expect(cekSiapBayar({ ...dasar, uangDiterima: 49999 })).toBe('tunai')
    expect(cekSiapBayar({ ...dasar, uangDiterima: 0 })).toBe('tunai')
  })

  it('tunai pas atau lebih boleh dibayar', () => {
    expect(cekSiapBayar({ ...dasar, uangDiterima: 50000 })).toBeNull()
    expect(cekSiapBayar({ ...dasar, uangDiterima: 100000 })).toBeNull()
  })

  it('non-tunai tidak butuh uang diterima', () => {
    expect(
      cekSiapBayar({ ...dasar, metode: 'QRIS', uangDiterima: 0 }),
    ).toBeNull()
  })

  it('split harus pas total dan punya baris bernilai', () => {
    expect(
      cekSiapBayar({
        ...dasar,
        split: true,
        baris: [{ jumlah: 20000 }, { jumlah: 30000 }],
      }),
    ).toBeNull()
    expect(
      cekSiapBayar({ ...dasar, split: true, baris: [{ jumlah: 10000 }] }),
    ).toBe('split')
    expect(
      cekSiapBayar({
        ...dasar,
        split: true,
        total: 0,
        baris: [{ jumlah: 0 }],
      }),
    ).toBe('split')
  })

  it('total nol dengan tunai tetap boleh (diskon penuh)', () => {
    expect(cekSiapBayar({ ...dasar, total: 0, uangDiterima: 0 })).toBeNull()
  })
})

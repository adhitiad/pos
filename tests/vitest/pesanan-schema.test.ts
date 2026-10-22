import { describe, expect, it } from 'vitest'

import {
  METODE_BAYAR_ONLINE,
  PesananOnlineSchema,
} from '#/validations/transaksi'

describe('PesananOnlineSchema (SEC-02)', () => {
  it('menerima field aman dan mengisi default metode bayar', () => {
    const hasil = PesananOnlineSchema.parse({
      items: [{ produkId: 'p1', qty: 2 }],
    })
    expect(hasil.metodeBayar).toBe('QRIS')
    expect(hasil.items).toHaveLength(1)
  })

  it('membuang field berbahaya yang dikirim klien', () => {
    const hasil = PesananOnlineSchema.parse({
      items: [{ produkId: 'p1', qty: 1 }],
      memberId: 'member-x',
      deliveryId: 'kurir-x',
      diskon: 999999,
      pajak: -10,
      tukarPoin: 500,
      uangDiterima: 0,
      statusPesanan: 'SELESAI',
      metodeBayar: 'QRIS',
    }) as Record<string, unknown>

    expect(hasil).not.toHaveProperty('memberId')
    expect(hasil).not.toHaveProperty('deliveryId')
    expect(hasil).not.toHaveProperty('diskon')
    expect(hasil).not.toHaveProperty('pajak')
    expect(hasil).not.toHaveProperty('tukarPoin')
    expect(hasil).not.toHaveProperty('uangDiterima')
    expect(hasil).not.toHaveProperty('statusPesanan')
  })

  it('menolak metode bayar yang tidak tersedia online', () => {
    for (const metode of ['TUNAI', 'KARTU']) {
      expect(() =>
        PesananOnlineSchema.parse({
          items: [{ produkId: 'p1', qty: 1 }],
          metodeBayar: metode,
        }),
      ).toThrow()
    }
  })

  it('hanya mengizinkan QRIS/TRANSFER/EWALLET', () => {
    expect(METODE_BAYAR_ONLINE).toEqual(['QRIS', 'TRANSFER', 'EWALLET'])
  })

  it('menolak keranjang kosong', () => {
    expect(() => PesananOnlineSchema.parse({ items: [] })).toThrow()
  })
})

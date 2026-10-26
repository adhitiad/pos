import { describe, expect, it } from 'vitest'

import {
  METODE_BAYAR_ONLINE,
  PesananOnlineSchema,
  PostingTransaksiSchema,
} from '#/validations/transaksi'
import { BuatPesananDrafSchema } from '#/validations/pesanan-draf'

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
      diskon: 999999,
      pajak: -10,
      tukarPoin: 500,
      uangDiterima: 0,
      statusPesanan: 'SELESAI',
      metodeBayar: 'QRIS',
    }) as Record<string, unknown>

    expect(hasil).not.toHaveProperty('memberId')
    expect(hasil).not.toHaveProperty('diskon')
    expect(hasil).not.toHaveProperty('pajak')
    expect(hasil).not.toHaveProperty('tukarPoin')
    expect(hasil).not.toHaveProperty('uangDiterima')
    expect(hasil).not.toHaveProperty('statusPesanan')
  })

  it('menyerap deliveryId karena tarif diambil dari master di server', () => {
    const hasil = PesananOnlineSchema.parse({
      items: [{ produkId: 'p1', qty: 1 }],
      deliveryId: 'kurir-x',
      alamat: 'Jl. Raya No. 1, Kota',
      metodeBayar: 'QRIS',
    }) as Record<string, unknown>

    expect(hasil.deliveryId).toBe('kurir-x')
    expect(hasil.alamat).toBe('Jl. Raya No. 1, Kota')
  })

  it('mengabaikan mejaId mentah (dine-in wajib token QR)', () => {
    const hasil = PesananOnlineSchema.parse({
      items: [{ produkId: 'p1', qty: 1 }],
      deliveryId: 'kurir-x',
      mejaId: 'meja-x',
      alamat: 'Jl. Raya No. 1, Kota',
    }) as Record<string, unknown>

    expect(hasil.deliveryId).toBe('kurir-x')
    expect(hasil).not.toHaveProperty('mejaId')
  })

  it('tolak deliveryId dan mejaToken secara bersamaan', () => {
    expect(() =>
      PesananOnlineSchema.parse({
        items: [{ produkId: 'p1', qty: 1 }],
        deliveryId: 'kurir-x',
        mejaToken: 'token-palsu',
        alamat: 'Jl. Raya No. 1, Kota',
      }),
    ).toThrow()
  })

  it('membuang mejaId mentah meski dikirim bersama token', () => {
    const hasil = PesananOnlineSchema.parse({
      items: [{ produkId: 'p1', qty: 1 }],
      mejaId: 'meja-x',
      mejaToken: 'token-palsu',
    }) as Record<string, unknown>

    expect(hasil.mejaToken).toBe('token-palsu')
    expect(hasil).not.toHaveProperty('mejaId')
  })

  it('tolak deliveryId tanpa alamat', () => {
    expect(() =>
      PesananOnlineSchema.parse({
        items: [{ produkId: 'p1', qty: 1 }],
        deliveryId: 'kurir-x',
      }),
    ).toThrow()
  })

  it('menerima mejaToken tanpa mejaId', () => {
    const hasil = PesananOnlineSchema.parse({
      items: [{ produkId: 'p1', qty: 1 }],
      mejaToken: 'token-x',
    }) as Record<string, unknown>

    expect(hasil.mejaToken).toBe('token-x')
    expect(hasil).not.toHaveProperty('mejaId')
  })

  it('METODE_BAYAR_ONLINE tidak mencakup TUNAI/KARTU', () => {
    expect(METODE_BAYAR_ONLINE).not.toContain('TUNAI')
    expect(METODE_BAYAR_ONLINE).not.toContain('KARTU')
  })
})

describe('PostingTransaksiSchema (hardening)', () => {
  it('menolak posting dengan status DIBATALKAN', () => {
    const hasil = PostingTransaksiSchema.safeParse({
      items: [{ produkId: 'p1', qty: 1 }],
      statusPesanan: 'DIBATALKAN',
    })
    expect(hasil.success).toBe(false)
  })

  it('tidak menerima statusKasirReview dari klien', () => {
    const hasil = PostingTransaksiSchema.parse({
      items: [{ produkId: 'p1', qty: 1 }],
      statusKasirReview: 'DISETUJUI',
    }) as Record<string, unknown>
    expect(hasil).not.toHaveProperty('statusKasirReview')
  })
})

describe('BuatPesananDrafSchema (publik)', () => {
  it('membuang memberId kiriman klien', () => {
    const hasil = BuatPesananDrafSchema.parse({
      items: [{ produkId: 'p1', qty: 1 }],
      mejaToken: 'token-x',
      memberId: 'member-x',
    }) as Record<string, unknown>
    expect(hasil).not.toHaveProperty('memberId')
  })

  it('mewajibkan mejaToken dan membuang mejaId mentah', () => {
    const hasil = BuatPesananDrafSchema.parse({
      items: [{ produkId: 'p1', qty: 1 }],
      mejaToken: 'token-x',
      mejaId: 'meja-x',
    }) as Record<string, unknown>
    expect(hasil.mejaToken).toBe('token-x')
    expect(hasil).not.toHaveProperty('mejaId')

    expect(() =>
      BuatPesananDrafSchema.parse({
        items: [{ produkId: 'p1', qty: 1 }],
        mejaId: 'meja-x',
      }),
    ).toThrow()
  })
})

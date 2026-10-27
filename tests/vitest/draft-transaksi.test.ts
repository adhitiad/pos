import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '../../src/db.js'
import { buatDraftTransaksi } from '#/server/draftTransaksi'
import { BuatDraftTransaksiSchema } from '#/validations/draft-transaksi'

// Payload persis seperti yang dikirim `useFormKasir`: item POS + ringkasan
// subtotal/total untuk daftar antrean. Angka final tetap dihitung ulang server
// saat review, tetapi draft tidak boleh gagal dibuat hanya karena ringkasan
// tidak ikut terkirim (regresi "expected number, received undefined").
const kasirId = 'usr-draft-test'
const email = `draft-test-${Date.now()}@pos.test`

const payloadKasir = {
  items: [{ produkId: 'produk-uji', qty: 2 }],
  diskon: 0,
  tukarPoin: 0,
  metodeBayar: 'TUNAI' as const,
  subtotal: 50_000,
  total: 50_000,
}

describe('BuatDraftTransaksiSchema', () => {
  it('menerima payload kasir beserta ringkasan subtotal/total', () => {
    const hasil = BuatDraftTransaksiSchema.parse(payloadKasir)
    expect(hasil.subtotal).toBe(50_000)
    expect(hasil.total).toBe(50_000)
    expect(hasil.statusPesanan).toBe('MENUNGGU')
    expect(hasil.dibuatOffline).toBe(false)
  })

  it('menolak payload tanpa ringkasan agar daftar antrean tidak menampilkan 0', () => {
    const {
      subtotal: _subtotal,
      total: _total,
      ...tanpaRingkasan
    } = payloadKasir
    expect(() => BuatDraftTransaksiSchema.parse(tanpaRingkasan)).toThrow()
  })
})

describe('buatDraftTransaksi', () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: kasirId,
        name: 'Kasir Draft Test',
        email,
        emailVerified: true,
        role: 'KASIR',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  })

  afterAll(async () => {
    await prisma.draftTransaksi.deleteMany({ where: { kasirId } })
    await prisma.user.deleteMany({ where: { id: kasirId } })
  })

  it('menyimpan draft dengan subtotal/total dari ringkasan klien', async () => {
    const draft = await buatDraftTransaksi(payloadKasir, kasirId)
    expect(draft.status).toBe('MENUNGGU')
    expect(draft.subtotal.toNumber()).toBe(50_000)
    expect(draft.total.toNumber()).toBe(50_000)
    expect(draft.payloadJson).toMatchObject({
      subtotal: 50_000,
      total: 50_000,
      metodeBayar: 'TUNAI',
    })
  })
})

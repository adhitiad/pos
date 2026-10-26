import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import { bacaTokenMeja } from '../../src/server/mejaToken.js'
import {
  createMeja,
  hapusMeja,
  mejaData,
  qrMeja,
  toggleMeja,
  updateMeja,
} from '../../src/server/meja.js'

async function bersihkan() {
  await prisma.transaksiItemModifier.deleteMany()
  await prisma.retur.deleteMany()
  await prisma.stokOpname.deleteMany()
  await prisma.transaksi.deleteMany()
  await prisma.meja.deleteMany()
}

describe('meja', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  it('create, lihat data, toggle aktif, update, hapus', async () => {
    const dibuat = await createMeja({
      nomor: 'A1',
      nama: 'Meja Sudut',
      aktif: true,
    })
    expect(dibuat.id).toBeDefined()

    const daftar = await mejaData()
    const m = daftar.find((x) => x.id === dibuat.id)
    expect(m?.nomor).toBe('A1')
    expect(m?.nama).toBe('Meja Sudut')
    expect(m?.aktif).toBe(true)

    const ditoggle = await toggleMeja({ id: dibuat.id, aktif: false })
    expect(ditoggle.aktif).toBe(false)

    const diupdate = await updateMeja({
      id: dibuat.id,
      nomor: 'A2',
      nama: 'Meja Baru',
      aktif: true,
    })
    expect(diupdate.id).toBe(dibuat.id)

    const daftar2 = await mejaData()
    const m2 = daftar2.find((x) => x.id === dibuat.id)
    expect(m2?.nomor).toBe('A2')
    expect(m2?.nama).toBe('Meja Baru')
    expect(m2?.aktif).toBe(true)

    await hapusMeja({ id: dibuat.id })
    const daftar3 = await mejaData()
    expect(daftar3.find((x) => x.id === dibuat.id)).toBeUndefined()
  })

  it('nomor meja duplikat gagal', async () => {
    await createMeja({ nomor: 'Z1', aktif: true })
    await expect(createMeja({ nomor: 'Z1', aktif: true })).rejects.toThrow(
      /sudah terpakai/,
    )
  })

  it('generate QR meja dan decode token-nya', async () => {
    const dibuat = await createMeja({
      nomor: 'Q1',
      nama: 'Meja QR',
      aktif: true,
    })

    const qr = await qrMeja({ id: dibuat.id })

    expect(qr.mejaId).toBe(dibuat.id)
    expect(qr.nomor).toBe('Q1')
    expect(qr.qrDataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
    expect(new URL(qr.url).pathname).toBe('/pesanan')
    expect(new URL(qr.url).searchParams.get('meja')).toBe(qr.token)
    expect(new Date(qr.berlakuSampai).getTime()).toBeGreaterThan(Date.now())

    const baca = bacaTokenMeja(qr.token)
    expect(baca.mejaId).toBe(dibuat.id)
  })

  it('QR meja meja tidak ditemukan', async () => {
    await expect(qrMeja({ id: 'tidak-ada-id' })).rejects.toThrow(
      'Meja tidak ditemukan',
    )
  })

  it('QR meja meja nonaktif', async () => {
    const dibuat = await createMeja({
      nomor: 'Q2',
      nama: 'Meja Mati',
      aktif: false,
    })
    await expect(qrMeja({ id: dibuat.id })).rejects.toThrow('Meja tidak aktif')
  })
})

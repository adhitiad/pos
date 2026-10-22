import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import {
  createMeja,
  hapusMeja,
  mejaData,
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
})

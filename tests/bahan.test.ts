import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { bahanData, createBahan, hapusBahan, updateBahan } from '#/server/bahan'

const dibuat: string[] = []

afterAll(async () => {
  await prisma.bahan.deleteMany({ where: { id: { in: dibuat } } })
})

describe('bahan — CRUD', () => {
  it('create → update → hapus', async () => {
    const { id } = await createBahan({
      nama: `Bahan-Test-${Date.now()}`,
      satuan: 'gr',
      stok: 10,
      stokMinimum: 2,
      hargaSatuan: 500,
    })
    dibuat.push(id)

    const awal = (await bahanData()).find((b) => b.id === id)
    expect(awal?.stok).toBe(10)
    expect(awal?.menipis).toBe(false)

    await updateBahan({
      id,
      nama: awal!.nama,
      satuan: 'kg',
      stok: 1,
      stokMinimum: 2,
      hargaSatuan: 600,
    })
    const setelah = (await bahanData()).find((b) => b.id === id)
    expect(setelah?.satuan).toBe('kg')
    expect(setelah?.hargaSatuan).toBe(600)
    expect(setelah?.menipis).toBe(true)

    await hapusBahan({ id })
    expect((await bahanData()).find((b) => b.id === id)).toBeUndefined()
  })

  it('update bahan tidak ada → GalatDomain', async () => {
    await expect(
      updateBahan({
        id: 'tidak-ada',
        nama: 'x',
        satuan: 'gr',
        stok: 0,
        stokMinimum: 0,
        hargaSatuan: 0,
      }),
    ).rejects.toThrow('tidak ditemukan')
  })

  it('hapus bahan tidak ada → GalatDomain', async () => {
    await expect(hapusBahan({ id: 'tidak-ada' })).rejects.toThrow(
      'tidak ditemukan',
    )
  })
})

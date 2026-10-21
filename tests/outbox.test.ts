import { describe, expect, it } from 'vitest'

import { antreanBaru, penyimpananMemory } from '../src/lib/outbox.js'

const payload = {
  items: [{ produkId: 'p1', qty: 2 }],
  diskon: 0,
  pajak: 0,
  tukarPoin: 0,
  metodeBayar: 'TUNAI' as const,
}

describe('antrean offline', () => {
  it('tambah + daftar FIFO', async () => {
    const simpan = penyimpananMemory()
    const a = antreanBaru({ ...payload })
    await new Promise((r) => setTimeout(r, 2))
    const b = antreanBaru({ ...payload })
    await simpan.tambah(b)
    await simpan.tambah(a)
    const daftar = await simpan.daftar()
    expect(daftar.map((x) => x.id)).toEqual([a.id, b.id])
    expect(daftar[0]?.galat).toBeNull()
  })

  it('tandai galat + hapus', async () => {
    const simpan = penyimpananMemory()
    const a = antreanBaru({ ...payload })
    await simpan.tambah(a)
    await simpan.tandai(a.id, 'Stok kurang')
    expect((await simpan.daftar())[0]?.galat).toBe('Stok kurang')
    await simpan.hapus(a.id)
    expect(await simpan.daftar()).toEqual([])
  })
})

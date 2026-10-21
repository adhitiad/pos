import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { notifikasiData, periodeNotifikasi } from '#/server/notifikasi'

const bahanIds: string[] = []

afterAll(async () => {
  await prisma.bahan.deleteMany({ where: { id: { in: bahanIds } } })
  await prisma.$disconnect()
})

describe('periode notifikasi', () => {
  it('harian, mingguan, dan bulanan memakai rentang lokal yang benar', () => {
    const senin = new Date(2026, 9, 19, 10, 30)
    const periode = periodeNotifikasi(senin)

    expect(periode.harian.labelDari).toBe('2026-10-19')
    expect(periode.harian.labelSampai).toBe('2026-10-19')
    expect(periode.mingguan.labelDari).toBe('2026-10-12')
    expect(periode.mingguan.labelSampai).toBe('2026-10-18')
    expect(periode.tampilkanMingguan).toBe(true)
    expect(periode.tampilkanBulanan).toBe(false)

    const tanggalSatu = periodeNotifikasi(new Date(2026, 10, 1, 9))
    expect(tanggalSatu.bulanan.labelDari).toBe('2026-10-01')
    expect(tanggalSatu.bulanan.labelSampai).toBe('2026-10-31')
    expect(tanggalSatu.tampilkanBulanan).toBe(true)
    expect(tanggalSatu.tampilkanMingguan).toBe(false)
  })
})

describe('notifikasi bahan', () => {
  it('hanya menampilkan bahan yang stoknya habis', async () => {
    const habis = await prisma.bahan.create({
      data: { nama: `Bahan-Habis-${Date.now()}`, satuan: 'gr', stok: 0 },
    })
    const aman = await prisma.bahan.create({
      data: { nama: `Bahan-Aman-${Date.now()}`, satuan: 'gr', stok: 5 },
    })
    bahanIds.push(habis.id, aman.id)

    const data = await notifikasiData(
      { role: 'OWNER', email: '' },
      new Date(2026, 9, 19, 10, 30),
    )
    const namaStok = new Set(
      data.filter((n) => n.tipe === 'stok').map((n) => n.nama),
    )

    expect(namaStok.has(habis.nama)).toBe(true)
    expect(namaStok.has(aman.nama)).toBe(false)
  })
})

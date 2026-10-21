import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '../src/db.js'
import { bukaShift, dataShift, tutupShift } from '#/server/shift'

const userIds: string[] = []

async function buatKasir() {
  const id = 'usr-shift-' + Math.random().toString(36).slice(2)
  const user = await prisma.user.create({
    data: {
      id,
      name: 'Kasir Shift Test',
      email: `shift+${Math.random()}@test.com`,
      emailVerified: true,
      role: 'KASIR',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  userIds.push(user.id)
  return user
}

afterAll(async () => {
  await prisma.shift.deleteMany({ where: { kasirId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
})

describe('shift — buka/tutup/data', () => {
  it('buka → data (aktif) → tutup → selisih', async () => {
    const kasir = await buatKasir()
    const pengguna = {
      id: kasir.id,
      name: kasir.name,
      email: kasir.email,
      role: 'KASIR' as const,
    }

    const buka = await bukaShift(kasir.id, { kasAwal: 100_000 })

    const data1 = await dataShift(pengguna, {})
    expect(data1.shiftAktif?.id).toBe(buka.id)
    expect(data1.shiftAktif?.seharusnya).toBe(100_000)
    expect(data1.shiftAktif?.jumlahTransaksi).toBe(0)

    const tutup = await tutupShift(kasir.id, { kasAkhir: 95_000 })
    expect(tutup.kasAwal).toBe(100_000)
    expect(tutup.seharusnya).toBe(100_000)
    expect(tutup.selisih).toBe(-5_000)

    const data2 = await dataShift(pengguna, {})
    expect(data2.shiftAktif).toBeNull()
    expect(data2.riwayat[0]?.id).toBe(buka.id)
    expect(data2.riwayat[0]?.selisih).toBe(-5_000)
  })

  it('tolak buka kedua saat masih terbuka', async () => {
    const kasir = await buatKasir()
    await bukaShift(kasir.id, { kasAwal: 50_000 })
    await expect(bukaShift(kasir.id, { kasAwal: 10_000 })).rejects.toThrow(
      'belum ditutup',
    )
  })

  it('tutup tanpa shift terbuka → GalatDomain', async () => {
    const kasir = await buatKasir()
    await expect(tutupShift(kasir.id, { kasAkhir: 0 })).rejects.toThrow(
      'Tidak ada shift yang terbuka',
    )
  })
})

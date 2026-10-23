import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import {
  batasDiskonKasir,
  KUNCI_DISKON_KASIR,
  normalisasiBatasDiskon,
} from '#/server/diskon'
import { postingTransaksi, ringkasHasil } from '#/server/transaksi'

let produkId = ''
let kasirId = ''
let ownerId = ''
let nilaiAwal: string | null = null
const transaksiIds: string[] = []

beforeAll(async () => {
  const unik = Date.now()
  const lama = await prisma.pengaturan.findUnique({
    where: { kunci: KUNCI_DISKON_KASIR },
  })
  nilaiAwal = lama?.nilai ?? null

  const produk = await prisma.produk.create({
    data: {
      nama: `Produk-Diskon-${unik}`,
      harga: 100_000,
      stok: 100,
      aktif: true,
    },
  })
  produkId = produk.id

  const kasir = await prisma.user.create({
    data: {
      id: `test-diskon-kasir-${unik}`,
      name: 'Kasir Diskon Uji',
      email: `diskon-kasir-${unik}@pos.test`,
      emailVerified: false,
      role: 'KASIR',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  kasirId = kasir.id

  const owner = await prisma.user.create({
    data: {
      id: `test-diskon-owner-${unik}`,
      name: 'Owner Diskon Uji',
      email: `diskon-owner-${unik}@pos.test`,
      emailVerified: false,
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  ownerId = owner.id

  await prisma.pengaturan.upsert({
    where: { kunci: KUNCI_DISKON_KASIR },
    create: { kunci: KUNCI_DISKON_KASIR, nilai: '10' },
    update: { nilai: '10' },
  })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { userId: { in: [kasirId, ownerId] } },
  })
  await prisma.jurnal.deleteMany({
    where: { transaksiId: { in: transaksiIds } },
  })
  await prisma.transaksiItem.deleteMany({
    where: { transaksiId: { in: transaksiIds } },
  })
  await prisma.pembayaran.deleteMany({
    where: { transaksiId: { in: transaksiIds } },
  })
  await prisma.transaksi.deleteMany({ where: { id: { in: transaksiIds } } })
  await prisma.transaksi.deleteMany({ where: { kasirId: { in: [kasirId] } } })
  await prisma.produk.deleteMany({ where: { id: produkId } })
  await prisma.user.deleteMany({ where: { id: { in: [kasirId, ownerId] } } })

  if (nilaiAwal === null) {
    await prisma.pengaturan.deleteMany({ where: { kunci: KUNCI_DISKON_KASIR } })
  } else {
    await prisma.pengaturan.update({
      where: { kunci: KUNCI_DISKON_KASIR },
      data: { nilai: nilaiAwal },
    })
  }
})

const payload = (diskon: number) => ({
  items: [{ produkId, qty: 1 }],
  diskon,
  metodeBayar: 'TUNAI' as const,
})

describe('kebijakan diskon kasir (SEC-22)', () => {
  it('menormalkan batas diskon ke 0–100 dengan default 10%', () => {
    expect(normalisasiBatasDiskon(undefined)).toBe(10)
    expect(normalisasiBatasDiskon('')).toBe(10)
    expect(normalisasiBatasDiskon('150')).toBe(100)
    expect(normalisasiBatasDiskon('-5')).toBe(0)
    expect(batasDiskonKasir(100_000, 10)).toBe(10_000)
    expect(batasDiskonKasir(99_999, 10)).toBe(9_999)
  })

  it('menolak diskon KASIR di atas ambang dan mencatat audit', async () => {
    await expect(
      postingTransaksi(payload(10_001), kasirId, {
        aktor: { id: kasirId, peran: 'KASIR' },
      }),
    ).rejects.toThrow(/Diskon melebihi batas kasir/)

    const jumlah = await prisma.transaksi.count({ where: { kasirId } })
    expect(jumlah).toBe(0)

    const audit = await prisma.auditLog.findFirst({
      where: { userId: kasirId, action: 'transaksi.diskon.ditolak' },
      orderBy: { timestamp: 'desc' },
    })
    expect(audit).not.toBeNull()
    expect(audit?.entity).toBe('Transaksi')
  })

  it('mengizinkan diskon KASIR tepat di ambang', async () => {
    const hasil = ringkasHasil(
      await postingTransaksi(payload(10_000), kasirId, {
        aktor: { id: kasirId, peran: 'KASIR' },
      }),
    )
    transaksiIds.push(hasil.transaksiId)
    expect(hasil.diskon).toBe(10_000)
    expect(hasil.total).toBe(90_000)
  })

  it('OWNER boleh melewati ambang, tetapi diskon dicatat audit', async () => {
    const hasil = ringkasHasil(
      await postingTransaksi(payload(50_000), ownerId, {
        aktor: { id: ownerId, peran: 'OWNER' },
      }),
    )
    transaksiIds.push(hasil.transaksiId)

    const audit = await prisma.auditLog.findFirst({
      where: {
        userId: ownerId,
        action: 'transaksi.diskon.owner',
        entityId: hasil.transaksiId,
      },
    })
    expect(audit).not.toBeNull()
  })
})

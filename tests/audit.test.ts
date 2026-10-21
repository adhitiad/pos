import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import { normalisasiJson, selisihField } from '#/server/audit'
import { auditLogData } from '#/server/auditLog'
import { setPengaturan } from '#/server/pengaturan'
import { createProduk, hapusProduk, updateProduk } from '#/server/produkMutasi'

const produkIds: string[] = []
const aktorId = `aktor-uji-${Date.now()}`

// Simpan nilai pengaturan awal agar dikembalikan setelah uji.
const namaTokoAwal = await prisma.pengaturan.findUnique({
  where: { kunci: 'nama_toko' },
  select: { nilai: true },
})

// Aktor harus user nyata: AuditLog.userId punya FK ke tabel user.
async function buatAktor() {
  await prisma.user.upsert({
    where: { id: aktorId },
    update: {},
    create: {
      id: aktorId,
      name: 'Aktor Uji',
      email: `${aktorId}@example.test`,
      emailVerified: true,
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return aktorId
}

afterAll(async () => {
  await prisma.produk.deleteMany({ where: { id: { in: produkIds } } })
  await prisma.auditLog.deleteMany({ where: { entity: 'Produk' } })
  await prisma.auditLog.deleteMany({ where: { entity: 'Pengaturan' } })
  await prisma.user.deleteMany({ where: { id: aktorId } })
  if (namaTokoAwal) {
    await prisma.pengaturan.update({
      where: { kunci: 'nama_toko' },
      data: { nilai: namaTokoAwal.nilai },
    })
  }
})

describe('audit — selisihField', () => {
  it('hanya field yang berubah yang diambil', () => {
    const hasil = selisihField(
      { nama: 'Kopi', harga: 1000, stok: 5 },
      { nama: 'Kopi', harga: 1200, stok: 5 },
    )
    expect(hasil.sebelum).toEqual({ harga: 1000 })
    expect(hasil.sesudah).toEqual({ harga: 1200 })
  })

  it('snapshot tanpa perubahan → kosong', () => {
    const hasil = selisihField({ aktif: true }, { aktif: true })
    expect(hasil.sesudah).toEqual({})
  })
})

describe('audit — normalisasiJson', () => {
  it('Decimal diubah jadi number, Date jadi ISO', () => {
    const hasil = normalisasiJson({
      harga: new Prisma.Decimal(1500),
      tanggal: new Date('2026-01-02T03:04:05.000Z'),
    }) as Record<string, unknown>
    expect(hasil.harga).toBe(1500)
    expect(hasil.tanggal).toBe('2026-01-02T03:04:05.000Z')
  })
})

describe('audit — penulisan AuditLog', () => {
  it('perubahan harga produk tercatat dengan before/after', async () => {
    const aktor = await buatAktor()
    const produk = await createProduk({
      nama: `Produk-Audit-${Date.now()}`,
      harga: 1000,
      stok: 10,
      aktif: true,
      resep: [],
    })
    produkIds.push(produk.id)

    await updateProduk(
      {
        id: produk.id,
        nama: `Produk-Audit-${Date.now()}`,
        harga: 1500,
        stok: 10,
        aktif: true,
        resep: [],
      },
      aktor,
    )

    const log = await prisma.auditLog.findFirst({
      where: { entity: 'Produk', entityId: produk.id, action: 'produk.ubah' },
      orderBy: { timestamp: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log?.before).toMatchObject({ harga: 1000 })
    expect(log?.after).toMatchObject({ harga: 1500 })
    expect(log?.userId).toBe(aktor)
  })

  it('hapus produk tercatat sebagai aksi hapus', async () => {
    const aktor = await buatAktor()
    const produk = await createProduk({
      nama: `Produk-Audit-Hapus-${Date.now()}`,
      harga: 2000,
      stok: 1,
      aktif: true,
      resep: [],
    })
    produkIds.push(produk.id)

    await hapusProduk({ id: produk.id }, aktor)

    const log = await prisma.auditLog.findFirst({
      where: { entity: 'Produk', entityId: produk.id, action: 'produk.hapus' },
    })
    expect(log).not.toBeNull()
    expect(log?.after).toMatchObject({ harga: 2000 })
  })

  it('perubahan pengaturan tercatat', async () => {
    const aktor = await buatAktor()
    const nilaiBaru = `Toko Uji ${Date.now()}`
    await setPengaturan({ kunci: 'nama_toko', nilai: nilaiBaru }, aktor)
    const log = await prisma.auditLog.findFirst({
      where: { entity: 'Pengaturan', action: 'pengaturan.ubah' },
      orderBy: { timestamp: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(log?.after).toMatchObject({ nilai: nilaiBaru })
  })

  it('auditLogData memfilter berdasarkan entitas', async () => {
    const hasil = await auditLogData({ entitas: 'Produk', take: 5 })
    expect(hasil.rows.length).toBeGreaterThan(0)
    expect(hasil.rows.every((r) => r.entitas === 'Produk')).toBe(true)
  })
})

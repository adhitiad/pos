import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '../../src/db.js'
import { simpanOpname } from '#/server/opname'
import { SimpanOpnameSchema } from '#/validations/opname'

// Id data uji yang dibuat — dibersihkan setelah suite agar DB dev tak
// dipenuhi sisa produk/bahan/user uji.
const produkIds: string[] = []
const bahanIds: string[] = []
const kategoriIds: string[] = []
const userIds: string[] = []

afterAll(async () => {
  // Opname dibuat oleh user uji → hapus lewat relasi kasirId.
  await prisma.stokOpnameItem.deleteMany({
    where: { opname: { kasirId: { in: userIds } } },
  })
  await prisma.stokOpname.deleteMany({ where: { kasirId: { in: userIds } } })
  await prisma.produkBahan.deleteMany({
    where: { produkId: { in: produkIds } },
  })
  await prisma.produk.deleteMany({ where: { id: { in: produkIds } } })
  await prisma.bahan.deleteMany({ where: { id: { in: bahanIds } } })
  await prisma.kategori.deleteMany({ where: { id: { in: kategoriIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
})

async function buatProduk(nama: string, stok: number) {
  const kategori = await prisma.kategori.create({
    data: { nama: 'Kategori Test', deskripsi: 'Test' },
  })
  kategoriIds.push(kategori.id)
  const produk = await prisma.produk.create({
    data: {
      nama,
      sku: 'SKU-' + Math.random().toString(36).slice(2),
      harga: 10000,
      stok,
      aktif: true,
      kategoriId: kategori.id,
    },
  })
  produkIds.push(produk.id)
  return produk
}

async function buatBahan(nama: string, stok: number) {
  const bahan = await prisma.bahan.create({
    data: { nama, satuan: 'pcs', stok, stokMinimum: 0, hargaSatuan: 5000 },
  })
  bahanIds.push(bahan.id)
  return bahan
}

async function buatUser(name: string, email: string) {
  const id = 'usr-' + Math.random().toString(36).slice(2)
  const user = await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      role: 'KASIR',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  userIds.push(user.id)
  return user
}

describe('opname — simpanOpname', () => {
  it('menerapkan koreksi stok produk + mencatat selisih', async () => {
    const produk = await buatProduk('Teh', 100)
    const kasir = await buatUser(
      'Kasir Opname',
      'opname+' + Math.random() + '@test.com',
    )

    const hasil = await simpanOpname(kasir.id, {
      jenis: 'PRODUK',
      catatan: 'Penyesuaian',
      items: [{ jenis: 'PRODUK', id: produk.id, stokFisik: 95 }],
    })

    expect(hasil.jenis).toBe('PRODUK')

    const pasca = await prisma.produk.findUnique({ where: { id: produk.id } })
    expect(pasca?.stok).toBe(95)

    const opname = await prisma.stokOpname.findFirst({
      where: { kasirId: kasir.id },
      include: { items: true },
    })
    expect(opname).not.toBeNull()
    const item = opname!.items[0]
    expect(item.stokTercatat.toNumber()).toBe(100)
    expect(item.stokFisik.toNumber()).toBe(95)
    expect(item.selisih.toNumber()).toBe(-5)
  })

  it('menerapkan koreksi stok bahan (Decimal)', async () => {
    const bahan = await buatBahan('Tepung', 50)
    const kasir = await buatUser(
      'Kasir Opname 2',
      'opname2+' + Math.random() + '@test.com',
    )

    await simpanOpname(kasir.id, {
      jenis: 'BAHAN',
      items: [{ jenis: 'BAHAN', id: bahan.id, stokFisik: 55 }],
    })

    const pasca = await prisma.bahan.findUnique({ where: { id: bahan.id } })
    expect(pasca?.stok.toNumber()).toBe(55)
  })

  it('tolak id produk tidak ditemukan', async () => {
    const kasir = await buatUser(
      'Kasir 3',
      'kasir3+' + Math.random() + '@test.com',
    )
    await expect(
      simpanOpname(kasir.id, {
        jenis: 'PRODUK',
        items: [{ jenis: 'PRODUK', id: 'tidak-ada', stokFisik: 1 }],
      }),
    ).rejects.toThrow('Produk tidak ditemukan')
  })

  it('schema tolak items kosong', () => {
    const r = SimpanOpnameSchema.safeParse({ jenis: 'PRODUK', items: [] })
    expect(r.success).toBe(false)
  })
})

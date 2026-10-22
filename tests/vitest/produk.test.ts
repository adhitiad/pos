import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import {
  produkLanding,
  produkTerbaru,
  produkTerpopuler,
} from '../../src/server/produk.js'

async function bersihkan() {
  await prisma.transaksiItemModifier.deleteMany()
  await prisma.transaksiItem.deleteMany()
  await prisma.retur.deleteMany()
  await prisma.stokOpname.deleteMany()
  await prisma.transaksi.deleteMany()
  await prisma.produk.deleteMany()
  await prisma.kategori.deleteMany()
}

describe('produkTerpopuler', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  async function buatProduk(
    nama: string,
    sku: string,
    harga: number,
    aktif = true,
    createdAt?: Date,
  ) {
    const kategori = await prisma.kategori.create({
      data: { nama: 'Kat', deskripsi: 'Test' },
    })
    return prisma.produk.create({
      data: {
        nama,
        sku,
        harga,
        stok: 10,
        aktif,
        kategoriId: kategori.id,
        ...(createdAt ? { createdAt } : {}),
      },
    })
  }

  it('mengurutkan produk menurut jumlah terjual (terbanyak dulu)', async () => {
    const a = await buatProduk('Produk A', 'P-A', 10000)
    const b = await buatProduk('Produk B', 'P-B', 20000)
    const c = await buatProduk('Produk C', 'P-C', 30000)

    await prisma.transaksi.create({
      data: {
        nomor: 'POS-T1',
        memberId: null,
        kasirId: null,
        ongkir: 0,
        subtotal: 30000,
        diskon: 0,
        pajak: 0,
        total: 30000,
        poinPakai: 0,
        poinDapat: 0,
        metodeBayar: 'TUNAI',
        items: {
          create: [
            {
              produkId: a.id,
              namaProduk: a.nama,
              harga: 10000,
              qty: 5,
              subtotal: 50000,
            },
            {
              produkId: b.id,
              namaProduk: b.nama,
              harga: 20000,
              qty: 3,
              subtotal: 60000,
            },
            {
              produkId: c.id,
              namaProduk: c.nama,
              harga: 30000,
              qty: 2,
              subtotal: 60000,
            },
          ],
        },
      },
    })

    const top = await produkTerpopuler(4)
    expect(top.map((p) => p.nama)).toEqual(['Produk A', 'Produk B', 'Produk C'])
    expect(top[0].terjual).toBe(5)
    expect(top[1].terjual).toBe(3)
    expect(top[2].terjual).toBe(2)
  })

  it('kembali kosong bila belum ada transaksi', async () => {
    await buatProduk('Produk X', 'P-X', 10000)
    const top = await produkTerpopuler(4)
    expect(top).toEqual([])
  })

  it('mengabaikan produk nonaktif', async () => {
    const aktif = await buatProduk('Produk Aktif', 'P-ON', 10000)
    const nonaktif = await buatProduk('Produk Nonaktif', 'P-OFF', 10000, false)

    await prisma.transaksi.create({
      data: {
        nomor: 'POS-T2',
        memberId: null,
        kasirId: null,
        ongkir: 0,
        subtotal: 20000,
        diskon: 0,
        pajak: 0,
        total: 20000,
        poinPakai: 0,
        poinDapat: 0,
        metodeBayar: 'TUNAI',
        items: {
          create: [
            {
              produkId: aktif.id,
              namaProduk: aktif.nama,
              harga: 10000,
              qty: 1,
              subtotal: 10000,
            },
            {
              produkId: nonaktif.id,
              namaProduk: nonaktif.nama,
              harga: 10000,
              qty: 9,
              subtotal: 90000,
            },
          ],
        },
      },
    })

    const top = await produkTerpopuler(4)
    expect(top.map((p) => p.nama)).toEqual(['Produk Aktif'])
  })

  it('mengurutkan produk baru menurut createdAt terbaru', async () => {
    await buatProduk('Lama', 'P-LAMA', 10000, true, new Date('2026-01-01'))
    await buatProduk('Tengah', 'P-TENGAH', 10000, true, new Date('2026-02-01'))
    await buatProduk('Baru', 'P-BARU', 10000, true, new Date('2026-03-01'))
    await buatProduk('Nonaktif', 'P-OFF', 10000, false, new Date('2026-04-01'))

    const hasil = await produkTerbaru(8)
    expect(hasil.map((p) => p.nama)).toEqual(['Baru', 'Tengah', 'Lama'])
  })

  it('menyusun baris populer, baru, dan campuran secara bergantian', async () => {
    const a = await buatProduk(
      'Produk A',
      'P-A',
      10000,
      true,
      new Date('2026-01-01'),
    )
    const b = await buatProduk(
      'Produk B',
      'P-B',
      10000,
      true,
      new Date('2026-01-02'),
    )
    await buatProduk('Produk C', 'P-C', 10000, true, new Date('2026-01-03'))
    await buatProduk('Produk D', 'P-D', 10000, true, new Date('2026-01-04'))

    await prisma.transaksi.create({
      data: {
        nomor: 'POS-T3',
        memberId: null,
        kasirId: null,
        ongkir: 0,
        subtotal: 80000,
        diskon: 0,
        pajak: 0,
        total: 80000,
        poinPakai: 0,
        poinDapat: 0,
        metodeBayar: 'TUNAI',
        items: {
          create: [
            {
              produkId: a.id,
              namaProduk: a.nama,
              harga: 10000,
              qty: 5,
              subtotal: 50000,
            },
            {
              produkId: b.id,
              namaProduk: b.nama,
              harga: 10000,
              qty: 3,
              subtotal: 30000,
            },
          ],
        },
      },
    })

    const hasil = await produkLanding(8)
    expect(hasil.populer.slice(0, 2).map((p) => p.nama)).toEqual([
      'Produk A',
      'Produk B',
    ])
    expect(hasil.baru.map((p) => p.nama)).toEqual([
      'Produk D',
      'Produk C',
      'Produk B',
      'Produk A',
    ])
    expect(hasil.campuran.map((p) => p.nama)).toEqual([
      'Produk A',
      'Produk D',
      'Produk B',
      'Produk C',
    ])
  })

  it('mengisi baris kosong dengan produk aktif acak saat belum ada penjualan', async () => {
    const produk = await Promise.all([
      buatProduk('Produk 1', 'P-1', 10000),
      buatProduk('Produk 2', 'P-2', 10000),
      buatProduk('Produk 3', 'P-3', 10000),
      buatProduk('Produk 4', 'P-4', 10000),
      buatProduk('Produk 5', 'P-5', 10000),
    ])
    await buatProduk('Produk Nonaktif', 'P-OFF', 10000, false)

    const hasil = await produkLanding(8)
    expect(hasil.populer).toHaveLength(4)
    expect(hasil.populer.every((p) => p.terjual === 0)).toBe(true)
    expect(new Set(hasil.populer.map((p) => p.produkId)).size).toBe(4)
    expect(
      hasil.populer.every((p) => produk.some((row) => row.id === p.produkId)),
    ).toBe(true)
    expect(hasil.baru).toHaveLength(5)
    expect(hasil.campuran).toHaveLength(5)
    expect(hasil.campuran[0].produkId).toBe(hasil.populer[0].produkId)
  })

  it('mengembalikan produk seadanya bila stok etalase di bawah empat', async () => {
    await buatProduk('Produk 1', 'P-1', 10000)
    await buatProduk('Produk 2', 'P-2', 10000)

    const hasil = await produkLanding(8)
    expect(hasil.populer).toHaveLength(2)
    expect(hasil.baru).toHaveLength(2)
    expect(hasil.campuran).toHaveLength(2)
  })

  it('landing kosong bila tidak ada produk aktif', async () => {
    await buatProduk('Produk Nonaktif', 'P-OFF', 10000, false)

    await expect(produkLanding(8)).resolves.toEqual({
      populer: [],
      baru: [],
      campuran: [],
    })
  })
})

import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '../../src/db.js'
import { buatRetur } from '#/server/retur'
import { BuatReturSchema } from '#/validations/retur'

// Id data uji yang dibuat — dibersihkan setelah suite agar DB dev tak
// dipenuhi sisa produk/transaksi/user uji.
const produkIds: string[] = []
const kategoriIds: string[] = []
const userIds: string[] = []
const transaksiIds: string[] = []

afterAll(async () => {
  await prisma.returItem.deleteMany({
    where: { retur: { transaksiId: { in: transaksiIds } } },
  })
  await prisma.retur.deleteMany({
    where: { transaksiId: { in: transaksiIds } },
  })
  await prisma.jurnalDetail.deleteMany({
    where: { jurnal: { transaksiId: { in: transaksiIds } } },
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
  await prisma.produkBahan.deleteMany({
    where: { produkId: { in: produkIds } },
  })
  await prisma.produk.deleteMany({ where: { id: { in: produkIds } } })
  await prisma.kategori.deleteMany({ where: { id: { in: kategoriIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
})

async function buatProduk(nama: string, stok: number, harga: number) {
  const kategori = await prisma.kategori.create({
    data: { nama: 'Kategori Test', deskripsi: 'Test' },
  })
  kategoriIds.push(kategori.id)
  const produk = await prisma.produk.create({
    data: {
      nama,
      sku: 'SKU-' + Math.random().toString(36).slice(2),
      harga,
      stok,
      aktif: true,
      kategoriId: kategori.id,
    },
  })
  produkIds.push(produk.id)
  return produk
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

async function buatTransaksiDenganItem(
  produkId: string,
  kasirId: string,
  qty: number,
) {
  const transaksi = await prisma.transaksi.create({
    data: {
      nomor: 'POS-TEST-' + Math.random().toString(36).slice(2),
      tanggal: new Date(),
      kasirId,
      subtotal: 10000,
      diskon: 0,
      pajak: 0,
      total: 10000,
      metodeBayar: 'TUNAI',
      dibayarPada: new Date(),
      items: {
        create: [
          {
            produkId,
            namaProduk: 'Produk Test',
            harga: 10000,
            qty,
            subtotal: 10000 * qty,
          },
        ],
      },
    },
    include: { items: true },
  })
  transaksiIds.push(transaksi.id)
  return transaksi
}

describe('retur — buatRetur', () => {
  it('mengembalikan stok produk + menulis jurnal pembalik', async () => {
    const produk = await buatProduk('Biskuit', 10, 10000)
    const kasir = await buatUser(
      'Kasir Test',
      'kasir+' + Math.random() + '@test.com',
    )
    const trx = await buatTransaksiDenganItem(produk.id, kasir.id, 3)

    const hasil = await buatRetur(kasir.id, {
      transaksiId: trx.id,
      alasan: 'Barang rusak',
      items: [{ produkId: trx.items[0].id, qty: 2 }],
    })

    expect(hasil.totalRetur).toBe(20000)

    // Stok produk dikurangi 3 saat transaksi, dikembalikan 2 saat retur -> 8
    const pasca = await prisma.produk.findUnique({ where: { id: produk.id } })
    expect(pasca?.stok).toBe(12)

    // Jurnal pembalik ada
    const jurnal = await prisma.jurnal.findFirst({
      where: { keterangan: { contains: 'Pembalik penjualan' } },
    })
    expect(jurnal).not.toBeNull()
    const entri = await prisma.jurnalDetail.findMany({
      where: { jurnalId: jurnal!.id },
    })
    const pendapatan = entri.find((e) => e.debit.toNumber() > 0)
    const kas = entri.find((e) => e.kredit.toNumber() > 0)
    expect(pendapatan?.debit.toNumber()).toBe(20000)
    expect(kas?.kredit.toNumber()).toBe(20000)
  })

  it('tolak qty retur melebihi qty dibeli', async () => {
    const produk = await buatProduk('Susu', 5, 5000)
    const kasir = await buatUser(
      'Kasir 2',
      'kasir2+' + Math.random() + '@test.com',
    )
    const trx = await buatTransaksiDenganItem(produk.id, kasir.id, 1)

    await expect(
      buatRetur(kasir.id, {
        transaksiId: trx.id,
        alasan: 'Test',
        items: [{ produkId: trx.items[0].id, qty: 99 }],
      }),
    ).rejects.toThrow('melebihi sisa qty')
  })

  it('menolak retur kumulatif melebihi qty dibeli', async () => {
    const produk = await buatProduk('Kopi', 10, 8000)
    const kasir = await buatUser(
      'Kasir 3',
      'kasir3+' + Math.random() + '@test.com',
    )
    const trx = await buatTransaksiDenganItem(produk.id, kasir.id, 3)

    await buatRetur(kasir.id, {
      transaksiId: trx.id,
      alasan: 'Retur pertama',
      items: [{ produkId: trx.items[0].id, qty: 2 }],
    })

    await expect(
      buatRetur(kasir.id, {
        transaksiId: trx.id,
        alasan: 'Retur kedua',
        items: [{ produkId: trx.items[0].id, qty: 2 }],
      }),
    ).rejects.toThrow('melebihi sisa qty')
  })

  it('schema tolak items kosong', () => {
    const r = BuatReturSchema.safeParse({
      transaksiId: 'x',
      alasan: 'a',
      items: [],
    })
    expect(r.success).toBe(false)
  })
})

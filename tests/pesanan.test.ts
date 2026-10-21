import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../src/db.js'
import { notifikasiData } from '../src/server/notifikasi.js'
import { pesanTransaksi } from '../src/server/pesanan.js'

async function buatProduk(
  nama: string,
  sku: string,
  harga: number,
  stok: number,
) {
  const kategori = await prisma.kategori.create({
    data: { nama: 'Kategori Pesan', deskripsi: 'Test' },
  })
  return prisma.produk.create({
    data: {
      nama,
      sku,
      harga,
      stok,
      aktif: true,
      kategoriId: kategori.id,
    },
  })
}

async function buatMeja(nomor: string, nama: string | null = null) {
  return prisma.meja.create({ data: { nomor, nama, aktif: true } })
}

async function bersihkan() {
  await prisma.transaksiItemModifier.deleteMany()
  await prisma.transaksiItem.deleteMany()
  await prisma.retur.deleteMany()
  await prisma.stokOpname.deleteMany()
  await prisma.transaksi.deleteMany()
  await prisma.jurnal.deleteMany()
  await prisma.produk.deleteMany()
  await prisma.kategori.deleteMany()
  await prisma.meja.deleteMany()
}

describe('pesanTransaksi (pesanan online)', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  it('membuat pesanan dine-in dengan pembayaran online QRIS, kasirId null', async () => {
    const produk = await buatProduk('Kopi', 'P-ONLINE-1', 20000, 10)
    const meja = await buatMeja('M1', 'Meja 1')

    const hasil = await pesanTransaksi({
      items: [{ produkId: produk.id, qty: 2 }],
      mejaId: meja.id,
      metodeBayar: 'QRIS',
    })

    expect(hasil.nomor).toBeDefined()
    expect(hasil.metodeBayar).toBe('QRIS')
    expect(hasil.statusPesanan).toBe('MENUNGGU')
    expect(hasil.mejaId).toBe(meja.id)
    expect(hasil.total).toBe(40000)
    expect(hasil.memberNama).toBeNull()

    const trx = await prisma.transaksi.findUnique({
      where: { id: hasil.transaksiId },
    })
    expect(trx!.kasirId).toBeNull()
  })

  it('membuat pesanan take-away (tanpa meja) dengan pembayaran TRANSFER', async () => {
    const produk = await buatProduk('Teh', 'P-ONLINE-2', 15000, 10)

    const hasil = await pesanTransaksi({
      items: [{ produkId: produk.id, qty: 1 }],
      metodeBayar: 'TRANSFER',
    })

    expect(hasil.metodeBayar).toBe('TRANSFER')
    expect(hasil.statusPesanan).toBe('MENUNGGU')
    expect(hasil.mejaId).toBeNull()
    expect(hasil.total).toBe(15000)
  })

  it('mengembalikan error bila produk tidak ditemukan', async () => {
    await expect(
      pesanTransaksi({
        items: [{ produkId: 'tidak-ada-id', qty: 1 }],
        metodeBayar: 'QRIS',
      }),
    ).rejects.toThrow('Produk tidak ditemukan')
  })

  it('menautkan pesanan online ke member dan memberi diskon/poin', async () => {
    const produk = await buatProduk('Roti', 'P-ONLINE-3', 20000, 10)
    const member = await prisma.member.create({
      data: {
        nama: 'Member Online',
        email: `member-online-${Date.now()}@pos.test`,
        diskonPersen: 10,
      },
    })

    const hasil = await pesanTransaksi(
      {
        items: [{ produkId: produk.id, qty: 1 }],
        metodeBayar: 'QRIS',
      },
      { memberId: member.id },
    )

    expect(hasil.memberNama).toBe(member.nama)
    expect(hasil.total).toBe(18000)

    const trx = await prisma.transaksi.findUnique({
      where: { id: hasil.transaksiId },
    })
    expect(trx!.memberId).toBe(member.id)

    const setelah = await prisma.member.findUniqueOrThrow({
      where: { id: member.id },
    })
    expect(setelah.poin).toBe(1)
    expect(setelah.totalBelanja.toNumber()).toBe(18000)

    const memberNotif = await notifikasiData({
      role: 'MEMBER',
      email: member.email!,
    })
    expect(memberNotif.some((n) => n.tipe === 'transaksi')).toBe(true)
    expect(
      memberNotif.some((n) => n.tipe === 'pesanan' && n.untuk === 'member'),
    ).toBe(true)

    const kasirNotif = await notifikasiData({ role: 'KASIR', email: '' })
    expect(
      kasirNotif.some(
        (n) =>
          n.tipe === 'pesanan' &&
          n.untuk === 'kasir' &&
          n.nomor === hasil.nomor,
      ),
    ).toBe(true)

    await prisma.member.delete({ where: { id: member.id } })
  })
})

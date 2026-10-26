import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import { buatTokenMeja } from '../../src/server/mejaToken.js'
import { notifikasiData } from '../../src/server/notifikasi.js'
import { pesanTransaksi } from '../../src/server/pesanan.js'
import {
  batalkanPesananOnline,
  tandaiPesananLunas,
} from '../../src/server/pembayaranPesanan.js'

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
  await prisma.delivery.deleteMany()
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
    const { token } = buatTokenMeja(meja.id)

    const hasil = await pesanTransaksi({
      items: [{ produkId: produk.id, qty: 2 }],
      mejaToken: token,
      metodeBayar: 'QRIS',
    })

    expect(hasil.nomor).toBeDefined()
    expect(hasil.metodeBayar).toBe('QRIS')
    expect(hasil.statusPesanan).toBe('MENUNGGU')
    expect(hasil.mejaId).toBe(meja.id)
    expect(hasil.total).toBe(40000)
    expect(hasil.memberNama).toBeNull()
    expect(hasil.jurnalId).toBeNull()

    const trx = await prisma.transaksi.findUnique({
      where: { id: hasil.transaksiId },
      include: { pembayaran: true, items: true, jurnal: true },
    })
    expect(trx!.kasirId).toBeNull()
    expect(trx!.sumber).toBe('ONLINE')
    expect(trx!.dibayarPada).toBeNull()
    expect(trx!.stokTerpotong).toBe(false)
    expect(trx!.pembayaran).toHaveLength(0)
    expect(trx!.jurnal).toBeNull()
    expect(trx!.items[0].qty).toBe(2)

    // Stok belum dipotong sampai pembayaran dikonfirmasi.
    const produkSetelah = await prisma.produk.findUniqueOrThrow({
      where: { id: produk.id },
    })
    expect(produkSetelah.stok).toBe(10)
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

  it('mengabaikan mejaId mentah pada pesanan publik', async () => {
    const produk = await buatProduk('Teh', 'P-ONLINE-MENTAH', 15000, 10)
    const meja = await buatMeja('M-MENTAH', 'Meja Mentah')

    const hasil = await pesanTransaksi({
      items: [{ produkId: produk.id, qty: 1 }],
      mejaId: meja.id,
      metodeBayar: 'QRIS',
    })

    expect(hasil.mejaId).toBeNull()
    const trx = await prisma.transaksi.findUniqueOrThrow({
      where: { id: hasil.transaksiId },
    })
    expect(trx.mejaId).toBeNull()
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
    expect(hasil.jurnalId).toBeNull()

    const trx = await prisma.transaksi.findUnique({
      where: { id: hasil.transaksiId },
    })
    expect(trx!.memberId).toBe(member.id)
    expect(trx!.dibayarPada).toBeNull()

    const sebelumBayar = await prisma.member.findUniqueOrThrow({
      where: { id: member.id },
    })
    expect(sebelumBayar.poin).toBe(0)
    expect(sebelumBayar.totalBelanja.toNumber()).toBe(0)

    const memberNotif = await notifikasiData({
      role: 'MEMBER',
      email: member.email!,
    })
    expect(memberNotif.some((n) => n.tipe === 'transaksi')).toBe(false)
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

    const lunas = await tandaiPesananLunas({
      id: hasil.transaksiId,
      via: 'MANUAL',
    })
    expect(lunas.jurnal).not.toBeNull()
    expect(lunas.transaksi.statusPesanan).toBe('MENUNGGU')

    const setelah = await prisma.member.findUniqueOrThrow({
      where: { id: member.id },
    })
    expect(setelah.poin).toBe(1)
    expect(setelah.totalBelanja.toNumber()).toBe(18000)

    const produkSetelah = await prisma.produk.findUniqueOrThrow({
      where: { id: produk.id },
    })
    expect(produkSetelah.stok).toBe(9)

    const trxLunas = await prisma.transaksi.findUniqueOrThrow({
      where: { id: hasil.transaksiId },
      include: { pembayaran: true, jurnal: true },
    })
    expect(trxLunas.dibayarPada).not.toBeNull()
    expect(trxLunas.dibayarVia).toBe('MANUAL')
    expect(trxLunas.stokTerpotong).toBe(true)
    expect(trxLunas.pembayaran).toHaveLength(1)
    expect(trxLunas.pembayaran[0].jumlah.toNumber()).toBe(18000)
    expect(trxLunas.jurnal).not.toBeNull()

    // Idempoten: konfirmasi ulang tidak menambah poin/stok.
    await tandaiPesananLunas({ id: hasil.transaksiId, via: 'MANUAL' })
    const setelahUlang = await prisma.member.findUniqueOrThrow({
      where: { id: member.id },
    })
    expect(setelahUlang.poin).toBe(1)
    expect(setelahUlang.totalBelanja.toNumber()).toBe(18000)
    const produkUlang = await prisma.produk.findUniqueOrThrow({
      where: { id: produk.id },
    })
    expect(produkUlang.stok).toBe(9)

    await prisma.member.delete({ where: { id: member.id } })
  })

  it('membatalkan pesanan online yang belum dibayar tanpa mengubah stok', async () => {
    const produk = await buatProduk('Batal', 'P-ONLINE-4', 10000, 5)
    const hasil = await pesanTransaksi({
      items: [{ produkId: produk.id, qty: 2 }],
      metodeBayar: 'QRIS',
    })

    await batalkanPesananOnline(hasil.transaksiId)
    const trx = await prisma.transaksi.findUniqueOrThrow({
      where: { id: hasil.transaksiId },
    })
    expect(trx.statusPesanan).toBe('DIBATALKAN')
    const produkSetelah = await prisma.produk.findUniqueOrThrow({
      where: { id: produk.id },
    })
    expect(produkSetelah.stok).toBe(5)
  })

  it('membuat pesanan antar dengan ongkir dari master delivery', async () => {
    const kurir = await prisma.delivery.create({
      data: {
        nama: 'Kurir Test',
        tarif: 7000,
        estimasi: '45 menit',
        aktif: true,
      },
    })
    const produk = await buatProduk('Mie', 'P-ANTAR-1', 25000, 10)

    const hasil = await pesanTransaksi({
      items: [{ produkId: produk.id, qty: 1 }],
      deliveryId: kurir.id,
      alamat: 'Jl. Contoh No. 123, Kota',
      metodeBayar: 'QRIS',
    })

    expect(hasil.deliveryId).toBe(kurir.id)
    expect(hasil.ongkir).toBe(7000)
    expect(hasil.total).toBe(25000 + 7000)
    expect(hasil.mejaId).toBeNull()

    const trx = await prisma.transaksi.findUniqueOrThrow({
      where: { id: hasil.transaksiId },
    })
    expect(trx.deliveryId).toBe(kurir.id)
    expect(trx.ongkir.toNumber()).toBe(7000)
    expect(trx.alamat).toBe('Jl. Contoh No. 123, Kota')
  })

  it('tolak pesanan antar bila layanan antar tidak aktif', async () => {
    const kurir = await prisma.delivery.create({
      data: {
        nama: 'Kurir Mati',
        tarif: 7000,
        estimasi: '45 menit',
        aktif: false,
      },
    })
    const produk = await buatProduk('Mie', 'P-ANTAR-2', 25000, 10)

    await expect(
      pesanTransaksi({
        items: [{ produkId: produk.id, qty: 1 }],
        deliveryId: kurir.id,
        alamat: 'Jl. Contoh No. 123, Kota',
        metodeBayar: 'QRIS',
      }),
    ).rejects.toThrow('Layanan antar tidak tersedia')
  })

  it('membuat pesanan dine-in dari token QR meja', async () => {
    const meja = await buatMeja('Q1', 'Meja QR')
    const produk = await buatProduk('Es Teh', 'P-QR-1', 12000, 10)

    const { token } = buatTokenMeja(meja.id)

    const hasil = await pesanTransaksi({
      items: [{ produkId: produk.id, qty: 2 }],
      mejaToken: token,
      metodeBayar: 'QRIS',
    })

    expect(hasil.mejaId).toBe(meja.id)
    expect(hasil.total).toBe(24000)

    const trx = await prisma.transaksi.findUniqueOrThrow({
      where: { id: hasil.transaksiId },
    })
    expect(trx.mejaId).toBe(meja.id)
    expect(trx.deliveryId).toBeNull()
  })

  it('tolak token QR meja yang tidak valid', async () => {
    const produk = await buatProduk('Es Teh', 'P-QR-2', 12000, 10)

    await expect(
      pesanTransaksi({
        items: [{ produkId: produk.id, qty: 1 }],
        mejaToken: 'bukan-token-yang-valid',
        metodeBayar: 'QRIS',
      }),
    ).rejects.toThrow('QR meja tidak valid')
  })

  it('tolak token QR meja yang meja-nya sudah nonaktif', async () => {
    const meja = await buatMeja('Q2', 'Meja Nonaktif')
    await prisma.meja.update({ where: { id: meja.id }, data: { aktif: false } })
    const produk = await buatProduk('Es Teh', 'P-QR-3', 12000, 10)

    const { token } = buatTokenMeja(meja.id)

    await expect(
      pesanTransaksi({
        items: [{ produkId: produk.id, qty: 1 }],
        mejaToken: token,
        metodeBayar: 'QRIS',
      }),
    ).rejects.toThrow('Meja tidak tersedia')
  })
})

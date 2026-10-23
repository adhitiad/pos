import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import { memberRiwayat } from '../../src/server/member.js'

async function bersihkan() {
  await prisma.transaksiItemModifier.deleteMany()
  await prisma.transaksiItem.deleteMany()
  await prisma.retur.deleteMany()
  await prisma.stokOpname.deleteMany()
  await prisma.transaksi.deleteMany()
  await prisma.produk.deleteMany()
  await prisma.kategori.deleteMany()
  await prisma.member.deleteMany()
}

async function buatMember(nama: string, telepon: string, poin = 0) {
  return prisma.member.create({
    data: { nama, telepon, poin },
  })
}

async function buatProduk(
  nama: string,
  sku: string,
  harga: number,
  stok: number,
) {
  const kategori = await prisma.kategori.create({
    data: { nama: 'Kat Member', deskripsi: 'Test' },
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

async function buatTransaksi(
  memberId: string | null,
  produkId: string,
  qty: number,
  harga: number,
) {
  return prisma.transaksi.create({
    data: {
      nomor: `POS-${Date.now()}`,
      memberId,
      kasirId: null,
      dibayarPada: new Date(),
      deliveryId: null,
      ongkir: 0,
      subtotal: harga * qty,
      diskon: 0,
      pajak: 0,
      total: harga * qty,
      poinPakai: 0,
      poinDapat: 0,
      metodeBayar: 'TUNAI',
      catatan: null,
      uangDiterima: null,
      kembalian: null,
      statusPesanan: 'SELESAI',
      items: {
        create: [
          { produkId, namaProduk: 'Produk', harga, qty, subtotal: harga * qty },
        ],
      },
    },
  })
}

describe('memberRiwayat', () => {
  beforeAll(async () => {
    await bersihkan()
    // Riwayat belanja ikut flag `riwayat_belanja_aktif` → test tak boleh
    // bergantung pada nilai setting yang mungkin diubah manual.
    await prisma.pengaturan.upsert({
      where: { kunci: 'riwayat_belanja_aktif' },
      update: { nilai: 'true' },
      create: { kunci: 'riwayat_belanja_aktif', nilai: 'true' },
    })
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
    // Kembalikan flag seperti semula (test tak boleh mengubah setting app).
    await prisma.pengaturan.update({
      where: { kunci: 'riwayat_belanja_aktif' },
      data: { nilai: 'true' },
    })
  })

  it('mengembalikan data member dan riwayat transaksinya', async () => {
    const member = await buatMember('Budi', '081234567890', 100)
    const produk = await buatProduk('Kopi', 'P-001', 20000, 10)

    await buatTransaksi(member.id, produk.id, 2, 20000)
    await buatTransaksi(member.id, produk.id, 1, 20000)

    const hasil = await memberRiwayat(member.id)

    expect(hasil.member.id).toBe(member.id)
    expect(hasil.member.nama).toBe('Budi')
    expect(hasil.member.poin).toBe(100)
    expect(hasil.transaksi).toHaveLength(2)
    expect(hasil.transaksi[0].nomor).toBeDefined()
    expect(hasil.transaksi[0].items).toHaveLength(1)
    expect(hasil.transaksi[0].items[0].nama).toBe('Produk')
    const total = hasil.transaksi.map((t) => t.total).sort((a, b) => a - b)
    expect(total).toEqual([20000, 40000])
  })

  it('mengembalikan riwayat kosong bila member belum pernah bertransaksi', async () => {
    const member = await buatMember('Siti', '081234567891', 0)

    const hasil = await memberRiwayat(member.id)

    expect(hasil.member.id).toBe(member.id)
    expect(hasil.transaksi).toHaveLength(0)
  })

  it('melempar error bila member tidak ditemukan', async () => {
    await expect(memberRiwayat('tidak-ada-id')).rejects.toThrow(
      'Member tidak ditemukan',
    )
  })
})

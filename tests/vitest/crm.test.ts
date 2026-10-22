import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import { tierDariTotal } from '../../src/server/member.js'
import {
  hitungDiskonMember,
  postingTransaksi,
  ringkasHasil,
} from '../../src/server/transaksi.js'

async function buatBahan(nama: string, stok: number, hargaSatuan: number) {
  return prisma.bahan.create({
    data: { nama, satuan: 'gr', stok, stokMinimum: 100, hargaSatuan },
  })
}

async function buatProduk(
  nama: string,
  sku: string,
  harga: number,
  stok: number,
  resep: { bahanId: string; jumlah: number }[] = [],
) {
  const kategori = await prisma.kategori.create({
    data: { nama: 'Kategori CRM', deskripsi: 'Test' },
  })
  return prisma.produk.create({
    data: {
      nama,
      sku,
      harga,
      stok,
      aktif: true,
      kategoriId: kategori.id,
      resep: {
        create: resep.map((r) => ({ bahanId: r.bahanId, jumlah: r.jumlah })),
      },
    },
  })
}

async function buatMemberCRM(
  nama: string,
  telepon: string,
  diskonPersen: number | null = null,
  totalBelanja = 0,
  tier: 'BRONZE' | 'SILVER' | 'GOLD' = 'BRONZE',
) {
  return prisma.member.create({
    data: { nama, telepon, diskonPersen, totalBelanja, tier },
  })
}

async function bersihkan() {
  await prisma.jurnalDetail.deleteMany()
  await prisma.jurnal.deleteMany()
  await prisma.transaksiItem.deleteMany()
  await prisma.pembayaran.deleteMany()
  await prisma.retur.deleteMany()
  await prisma.stokOpname.deleteMany()
  await prisma.transaksi.deleteMany()
  await prisma.produkBahan.deleteMany()
  await prisma.produk.deleteMany()
  await prisma.kategori.deleteMany()
  await prisma.bahan.deleteMany()
  await prisma.member.deleteMany()
}

describe('tierDariTotal', () => {
  it('batas bawah BRONZE', () => {
    expect(tierDariTotal(0)).toBe('BRONZE')
    expect(tierDariTotal(2_999_999)).toBe('BRONZE')
  })
  it('SILVER', () => {
    expect(tierDariTotal(3_000_000)).toBe('SILVER')
    expect(tierDariTotal(9_999_999)).toBe('SILVER')
  })
  it('GOLD', () => {
    expect(tierDariTotal(10_000_000)).toBe('GOLD')
    expect(tierDariTotal(10_000_001)).toBe('GOLD')
  })
})

describe('hitungDiskonMember', () => {
  it('10% dari subtotal', () => {
    expect(hitungDiskonMember(100_000, 0, 10)).toBe(10_000)
  })
  it('diterapkan pada sisa setelah diskon manual', () => {
    expect(hitungDiskonMember(100_000, 40_000, 10)).toBe(6_000)
  })
  it('persen 0 = 0', () => {
    expect(hitungDiskonMember(100_000, 0, 0)).toBe(0)
  })
  it('tidak negatif bila diskon manual melebihi subtotal', () => {
    expect(hitungDiskonMember(10_000, 20_000, 10)).toBe(0)
  })
})

describe('postingTransaksi + diskon member', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  it('diskon member otomatis dikurangi & totalBelanja/tier diperbarui', async () => {
    const kopi = await buatBahan('Biji CRM', 5000, 1.2)
    const produk = await buatProduk('Kopi CRM', 'CRM-001', 10_000, 10, [
      { bahanId: kopi.id, jumlah: 100 },
    ])
    const member = await buatMemberCRM('Budi CRM', '081234567890', 10)

    const hasil = ringkasHasil(
      await postingTransaksi({
        items: [{ produkId: produk.id, qty: 2 }],
        memberId: member.id,
        diskon: 0,
        pajak: 0,
        tukarPoin: 0,
        metodeBayar: 'TUNAI',
      }),
    )

    expect(hasil.subtotal).toBe(20_000)
    expect(hasil.diskonMember).toBe(2_000)
    expect(hasil.total).toBe(18_000)
    expect(hasil.memberTotalBelanja).toBe(18_000)
    expect(hasil.memberTier).toBe('BRONZE')
    expect(hasil.memberNama).toBe('Budi CRM')

    const terkini = await prisma.member.findUnique({ where: { id: member.id } })
    expect(terkini!.totalBelanja.toNumber()).toBe(18_000)
    expect(terkini!.tier).toBe('BRONZE')
  })
})

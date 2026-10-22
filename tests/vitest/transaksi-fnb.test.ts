import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import {
  createModifier,
  createModifierGrup,
} from '../../src/server/modifier.js'
import { createMeja } from '../../src/server/meja.js'
import { postingTransaksi, ringkasHasil } from '../../src/server/transaksi.js'

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
    data: { nama: 'Kategori F&B', deskripsi: 'Test' },
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

async function bersihkan() {
  await prisma.nomorHarian.deleteMany()
  await prisma.jurnalDetail.deleteMany()
  await prisma.jurnal.deleteMany()
  await prisma.transaksiItemModifier.deleteMany()
  await prisma.retur.deleteMany()
  await prisma.stokOpname.deleteMany()
  await prisma.transaksi.deleteMany()
  await prisma.produkModifierGrup.deleteMany()
  await prisma.modifier.deleteMany()
  await prisma.modifierGrup.deleteMany()
  await prisma.meja.deleteMany()
  await prisma.produkBahan.deleteMany()
  await prisma.produk.deleteMany()
  await prisma.kategori.deleteMany()
  await prisma.bahan.deleteMany()
  await prisma.member.deleteMany()
}

describe('postingTransaksi F&B (meja + modifier + diskon member)', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  it('meja + modifier + diskon member otomatis & totalBelanja/tier terupdate', async () => {
    const kopi = await buatBahan('Biji F&B', 5000, 1.2)
    const produk = await buatProduk('Kopi F&B', 'FNB-001', 20_000, 10, [
      { bahanId: kopi.id, jumlah: 100 },
    ])
    const grup = await createModifierGrup({
      nama: 'Topping',
      wajib: false,
      min: 0,
      max: 99,
      aktif: true,
    })
    const mod = await createModifier({
      grupId: grup.id,
      nama: 'Extra Susu',
      hargaTambahan: 3000,
      aktif: true,
    })
    await prisma.produkModifierGrup.create({
      data: { produkId: produk.id, grupId: grup.id },
    })
    const meja = await createMeja({ nomor: '1', nama: 'Meja 1', aktif: true })
    const member = await prisma.member.create({
      data: {
        nama: 'Budi F&B',
        telepon: '081234567891',
        diskonPersen: 10,
        totalBelanja: 0,
        tier: 'BRONZE',
      },
    })

    const hasil = ringkasHasil(
      await postingTransaksi({
        items: [
          {
            produkId: produk.id,
            qty: 2,
            modifiers: [{ modifierId: mod.id, qty: 1 }],
          },
        ],
        memberId: member.id,
        diskon: 0,
        pajak: 0,
        tukarPoin: 0,
        metodeBayar: 'TUNAI',
        mejaId: meja.id,
        statusPesanan: 'MENUNGGU',
      }),
    )

    // subtotal 2 x 20000 + 1 x 3000 (modifier tambahan masuk subtotal) = 43000
    expect(hasil.subtotal).toBe(43_000)
    expect(hasil.diskonMember).toBe(4_300) // 10% dari 43000
    expect(hasil.total).toBe(38_700)
    expect(hasil.mejaId).toBe(meja.id)
    expect(hasil.statusPesanan).toBe('MENUNGGU')
    expect(hasil.memberTotalBelanja).toBe(38_700)
    expect(hasil.memberTier).toBe('BRONZE')
    expect(hasil.items[0].modifiers).toHaveLength(1)
    expect(hasil.items[0].modifiers[0].modifier).toBe('Extra Susu')
    expect(hasil.items[0].modifiers[0].tambahan).toBe(3000)

    const tersimpan = await prisma.transaksi.findUnique({
      where: { id: hasil.transaksiId },
      include: { pembayaran: true },
    })
    expect(tersimpan?.mejaId).toBe(meja.id)
    expect(tersimpan?.statusPesanan).toBe('MENUNGGU')
    expect(tersimpan?.pembayaran).toHaveLength(1)

    const memberTerbaru = await prisma.member.findUnique({
      where: { id: member.id },
    })
    expect(memberTerbaru!.totalBelanja.toNumber()).toBe(38_700)
    expect(memberTerbaru!.tier).toBe('BRONZE')
  })
})

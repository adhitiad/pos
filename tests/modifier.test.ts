import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../src/db.js'
import {
  createModifier,
  createModifierGrup,
  hapusModifier,
  hapusModifierGrup,
  modifierData,
  modifierGrupData,
  toggleModifier,
  toggleModifierGrup,
  updateModifier,
  updateModifierGrup,
} from '../src/server/modifier.js'

async function bersihkan() {
  await prisma.transaksiItemModifier.deleteMany()
  await prisma.produkModifierGrup.deleteMany()
  await prisma.modifier.deleteMany()
  await prisma.modifierGrup.deleteMany()
}

describe('modifier grup', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  it('create, data, toggle, update, hapus', async () => {
    const g = await createModifierGrup({
      nama: 'Topping',
      wajib: true,
      min: 1,
      max: 2,
      aktif: true,
    })
    expect(g.id).toBeDefined()

    const daftar = await modifierGrupData()
    const grup = daftar.find((x) => x.id === g.id)
    expect(grup?.nama).toBe('Topping')
    expect(grup?.wajib).toBe(true)
    expect(grup?.min).toBe(1)
    expect(grup?.max).toBe(2)
    expect(grup?.aktif).toBe(true)

    const ditoggle = await toggleModifierGrup({ id: g.id, aktif: false })
    expect(ditoggle.aktif).toBe(false)

    const diupdate = await updateModifierGrup({
      id: g.id,
      nama: 'Topping Baru',
      wajib: false,
      min: 0,
      max: 5,
      aktif: true,
    })
    expect(diupdate.id).toBe(g.id)

    const daftar2 = await modifierGrupData()
    const g2 = daftar2.find((x) => x.id === g.id)
    expect(g2?.nama).toBe('Topping Baru')
    expect(g2?.wajib).toBe(false)
    expect(g2?.min).toBe(0)
    expect(g2?.max).toBe(5)

    await hapusModifierGrup({ id: g.id })
    const daftar3 = await modifierGrupData()
    expect(daftar3.find((x) => x.id === g.id)).toBeUndefined()
  })

  it('hapus grup yang dipakai produk gagal', async () => {
    const kategori = await prisma.kategori.create({
      data: { nama: 'Kat Mod', deskripsi: 'Test' },
    })
    const produk = await prisma.produk.create({
      data: {
        nama: 'Produk Mod',
        sku: 'PROD-MOD',
        harga: 10000,
        stok: 10,
        aktif: true,
        kategoriId: kategori.id,
      },
    })
    const grup = await createModifierGrup({
      nama: 'Sambal',
      wajib: false,
      min: 0,
      max: 99,
      aktif: true,
    })
    await prisma.produkModifierGrup.create({
      data: { produkId: produk.id, grupId: grup.id },
    })
    await expect(hapusModifierGrup({ id: grup.id })).rejects.toThrow(/dipakai/)
  })
})

describe('modifier', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  it('create, data per grup, toggle, update, hapus', async () => {
    const grup = await createModifierGrup({
      nama: 'Grup M',
      wajib: false,
      min: 0,
      max: 99,
      aktif: true,
    })
    const m = await createModifier({
      grupId: grup.id,
      nama: 'Extra Keju',
      hargaTambahan: 5000,
      aktif: true,
    })
    expect(m.id).toBeDefined()

    const daftar = await modifierData(grup.id)
    const mod = daftar.find((x) => x.id === m.id)
    expect(mod?.nama).toBe('Extra Keju')
    expect(mod?.hargaTambahan).toBe(5000)
    expect(mod?.aktif).toBe(true)
    expect(mod?.grupId).toBe(grup.id)

    const ditoggle = await toggleModifier({ id: m.id, aktif: false })
    expect(ditoggle.aktif).toBe(false)

    const diupdate = await updateModifier({
      id: m.id,
      grupId: grup.id,
      nama: 'Extra Keju Baru',
      hargaTambahan: 7000,
      aktif: true,
    })
    expect(diupdate.id).toBe(m.id)

    const daftar2 = await modifierData(grup.id)
    const m2 = daftar2.find((x) => x.id === m.id)
    expect(m2?.nama).toBe('Extra Keju Baru')
    expect(m2?.hargaTambahan).toBe(7000)

    await hapusModifier({ id: m.id })
    const daftar3 = await modifierData(grup.id)
    expect(daftar3.find((x) => x.id === m.id)).toBeUndefined()
  })

  it('modifier yang sudah dipakai transaksi tidak bisa dihapus', async () => {
    const kategori = await prisma.kategori.create({
      data: { nama: 'Kat Mod2', deskripsi: 'Test' },
    })
    const produk = await prisma.produk.create({
      data: {
        nama: 'Produk Mod2',
        sku: 'PROD-MOD2',
        harga: 10000,
        stok: 10,
        aktif: true,
        kategoriId: kategori.id,
      },
    })
    const grup = await createModifierGrup({
      nama: 'Grup M2',
      wajib: false,
      min: 0,
      max: 99,
      aktif: true,
    })
    const mod = await createModifier({
      grupId: grup.id,
      nama: 'Topping',
      hargaTambahan: 0,
      aktif: true,
    })

    await prisma.produk.create({
      data: {
        nama: 'Produk X',
        sku: 'PROD-X',
        harga: 5000,
        stok: 5,
        aktif: true,
        kategoriId: kategori.id,
      },
    })
    // buat transaksi item yang pakai modifier
    const trx = await prisma.transaksi.create({
      data: {
        nomor: 'POS-MOD',
        subtotal: 10000,
        diskon: 0,
        pajak: 0,
        total: 10000,
        poinPakai: 0,
        poinDapat: 0,
        metodeBayar: 'TUNAI',
        items: {
          create: [
            {
              produkId: produk.id,
              namaProduk: 'Produk Mod2',
              harga: 10000,
              qty: 1,
              subtotal: 10000,
            },
          ],
        },
      },
    })
    const item = await prisma.transaksiItem.findFirst({
      where: { transaksiId: trx.id },
    })
    await prisma.transaksiItemModifier.create({
      data: { transaksiItemId: item!.id, modifierId: mod.id, qty: 1 },
    })

    await expect(hapusModifier({ id: mod.id })).rejects.toThrow(
      /terpakai dalam transaksi/,
    )
  })
})

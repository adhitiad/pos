import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { daftarPembelianBahan, pembelianBahan } from '#/server/pembelianBahan'

const bahanIds: string[] = []
const supplierIds: string[] = []

afterAll(async () => {
  await prisma.pembelianBahan.deleteMany({
    where: { bahanId: { in: bahanIds } },
  })
  await prisma.bahan.deleteMany({ where: { id: { in: bahanIds } } })
  await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } })
})

describe('pembelianBahan', () => {
  it('mencatat pembelian dan menambah stok bahan', async () => {
    const bahan = await prisma.bahan.create({
      data: {
        nama: `Bahan-Beli-${Date.now()}`,
        satuan: 'gr',
        stok: 100,
        stokMinimum: 10,
        hargaSatuan: 500,
      },
    })
    bahanIds.push(bahan.id)

    const hasil = await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 50,
      hargaSatuan: 700,
      catatan: 'restock uji',
      sumberBelanja: 'PASAR_ONLINE',
      tempatBelanja: 'Tokopedia',
    })

    expect(hasil.bahanNama).toBe(bahan.nama)
    expect(hasil.totalHarga).toBe(35_000)
    expect(hasil.catatan).toBe('restock uji')
    expect(hasil.belumDibayar).toBe(0)
    expect(hasil.supplierNama).toBeNull()
    expect(hasil.sumberBelanja).toBe('PASAR_ONLINE')
    expect(hasil.tempatBelanja).toBe('Tokopedia')

    const terbaru = await prisma.bahan.findUniqueOrThrow({
      where: { id: bahan.id },
    })
    expect(terbaru.stok.toNumber()).toBe(150)
    expect(terbaru.hargaSatuan.toNumber()).toBe(700)

    const daftar = await daftarPembelianBahan({ bahanId: bahan.id })
    expect(daftar.some((p) => p.id === hasil.id)).toBe(true)
  })

  it('pembelian dengan supplier tercatat lengkap', async () => {
    const supplier = await prisma.supplier.create({
      data: { nama: `Supplier-Beli-${Date.now()}`, aktif: true },
    })
    supplierIds.push(supplier.id)
    const bahan = await prisma.bahan.create({
      data: {
        nama: `Bahan-Beli-Supplier-${Date.now()}`,
        satuan: 'kg',
        stok: 0,
        stokMinimum: 1,
        hargaSatuan: 100,
      },
    })
    bahanIds.push(bahan.id)

    const hasil = await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 5,
      hargaSatuan: 2000,
      supplierId: supplier.id,
      hutang: false,
    })

    expect(hasil.supplierId).toBe(supplier.id)
    expect(hasil.supplierNama).toBe(supplier.nama)
    expect(hasil.belumDibayar).toBe(0)
    // Sumber belanja ditentukan server: ada supplier → SUPPLIER.
    expect(hasil.sumberBelanja).toBe('SUPPLIER')
    expect(hasil.tempatBelanja).toBeNull()

    const daftar = await daftarPembelianBahan({ supplierId: supplier.id })
    expect(daftar).toHaveLength(1)
    expect(daftar[0]?.supplierNama).toBe(supplier.nama)
  })

  it('tanpa supplier → wajib menandai sumber pasar', async () => {
    const bahan = await prisma.bahan.create({
      data: {
        nama: `Bahan-Pasar-${Date.now()}`,
        satuan: 'kg',
        stok: 0,
        stokMinimum: 1,
        hargaSatuan: 100,
      },
    })
    bahanIds.push(bahan.id)

    // Tanpa sumber pasar → ditolak (sumber default SUPPLIER tidak valid).
    await expect(
      pembelianBahan({
        bahanId: bahan.id,
        jumlah: 1,
        hargaSatuan: 100,
      }),
    ).rejects.toThrow('sumber belanja')

    const hasil = await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 2,
      hargaSatuan: 1500,
      sumberBelanja: 'PASAR_ONLINE',
      tempatBelanja: 'Tokopedia',
    })
    expect(hasil.sumberBelanja).toBe('PASAR_ONLINE')
    expect(hasil.tempatBelanja).toBe('Tokopedia')
    expect(hasil.supplierNama).toBeNull()
  })
})

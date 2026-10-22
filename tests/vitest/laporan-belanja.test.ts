import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { pembelianBahan } from '#/server/pembelianBahan'
import { laporanBelanja } from '#/server/laporanBelanja'

const bahanIds: string[] = []
const supplierIds: string[] = []

afterAll(async () => {
  await prisma.pembelianBahan.deleteMany({
    where: { bahanId: { in: bahanIds } },
  })
  await prisma.bahan.deleteMany({ where: { id: { in: bahanIds } } })
  await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } })
})

describe('laporanBelanja', () => {
  it('rekap total, per supplier, per bulan, dan detail', async () => {
    const supplier = await prisma.supplier.create({
      data: { nama: `Supplier-Laporan-${Date.now()}`, aktif: true },
    })
    supplierIds.push(supplier.id)
    const bahan = await prisma.bahan.create({
      data: {
        nama: `Bahan-Laporan-${Date.now()}`,
        satuan: 'kg',
        stok: 0,
        stokMinimum: 1,
        hargaSatuan: 100,
      },
    })
    bahanIds.push(bahan.id)

    await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 10,
      hargaSatuan: 1000,
      supplierId: supplier.id,
      hutang: true,
    })
    await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 5,
      hargaSatuan: 2000,
      supplierId: supplier.id,
      hutang: false,
    })

    const laporan = await laporanBelanja({
      dari: '2020-01-01',
      sampai: '2099-12-31',
    })

    expect(laporan.jumlahPembelian).toBe(2)
    expect(laporan.totalBelanja).toBe(20_000)
    expect(laporan.totalHutang).toBe(10_000)
    expect(laporan.perSumber).toHaveLength(1)
    expect(laporan.perSumber[0]?.nama).toBe(supplier.nama)
    expect(laporan.perSumber[0]?.sumberBelanja).toBe('SUPPLIER')
    expect(laporan.perSumber[0]?.jumlah).toBe(2)
    expect(laporan.perSumber[0]?.total).toBe(20_000)
    expect(laporan.perSumber[0]?.hutang).toBe(10_000)
    expect(laporan.perBulan.length).toBeGreaterThan(0)
    expect(laporan.detail).toHaveLength(2)
    expect(laporan.detail[0]?.supplierNama).toBe(supplier.nama)
  })

  it('filter supplierId hanya menampilkan pembelian supplier itu', async () => {
    const laporan = await laporanBelanja({
      dari: '2020-01-01',
      sampai: '2099-12-31',
      supplierId: 'supplier-tidak-ada',
    })
    expect(laporan.jumlahPembelian).toBe(0)
    expect(laporan.totalBelanja).toBe(0)
  })

  it('pembelian ke pasar dikelompokkan sebagai sumber tersendiri', async () => {
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

    await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 3,
      hargaSatuan: 4000,
      sumberBelanja: 'PASAR_OFFLINE',
      tempatBelanja: 'Pasar Kebayoran',
    })

    const laporan = await laporanBelanja({
      dari: '2020-01-01',
      sampai: '2099-12-31',
    })
    const pasar = laporan.perSumber.find(
      (s) => s.sumberBelanja === 'PASAR_OFFLINE',
    )
    expect(pasar?.nama).toBe('Pasar Offline')
    expect(pasar?.total).toBe(12_000)
    expect(
      laporan.detail.some((d) => d.tempatBelanja === 'Pasar Kebayoran'),
    ).toBe(true)
  })

  it('rentang tanggal terbalik → GalatDomain', async () => {
    await expect(
      laporanBelanja({ dari: '2026-05-01', sampai: '2026-01-01' }),
    ).rejects.toThrow('Rentang tanggal tidak valid')
  })
})

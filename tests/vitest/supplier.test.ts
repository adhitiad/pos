import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { pembelianBahan } from '#/server/pembelianBahan'
import {
  catatPembayaranHutang,
  createSupplier,
  hapusSupplier,
  hutangSupplier,
  supplierData,
  updateSupplier,
} from '#/server/supplier'

const supplierIds: string[] = []
const bahanIds: string[] = []

afterAll(async () => {
  await prisma.pembelianBahan.deleteMany({
    where: { bahanId: { in: bahanIds } },
  })
  await prisma.bahan.deleteMany({ where: { id: { in: bahanIds } } })
  await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } })
})

async function buatBahan() {
  const bahan = await prisma.bahan.create({
    data: {
      nama: `Bahan-Supplier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      satuan: 'gr',
      stok: 10,
      stokMinimum: 1,
      hargaSatuan: 100,
    },
  })
  bahanIds.push(bahan.id)
  return bahan
}

describe('supplier — CRUD', () => {
  it('create → update → hapus', async () => {
    const { id } = await createSupplier({
      nama: `Supplier-Test-${Date.now()}`,
      kontak: '0812',
      alamat: 'Jl. Test',
      catatan: 'ketentuan 30 hari',
      aktif: true,
    })
    supplierIds.push(id)

    const awal = (await supplierData()).find((s) => s.id === id)
    expect(awal?.nama).toContain('Supplier-Test')
    expect(awal?.jumlahPembelian).toBe(0)
    expect(awal?.hutang).toBe(0)

    await updateSupplier({
      id,
      nama: 'Supplier Baru',
      kontak: '0899',
      alamat: 'Jl. Baru',
      catatan: 'updated',
      aktif: false,
    })
    const setelah = (await supplierData()).find((s) => s.id === id)
    expect(setelah?.nama).toBe('Supplier Baru')
    expect(setelah?.aktif).toBe(false)

    await hapusSupplier({ id })
    expect((await supplierData()).find((s) => s.id === id)).toBeUndefined()
    supplierIds.splice(supplierIds.indexOf(id), 1)
  })

  it('update supplier tidak ada → GalatDomain', async () => {
    await expect(
      updateSupplier({
        id: 'tidak-ada',
        nama: 'x',
        kontak: '',
        alamat: '',
        catatan: '',
        aktif: true,
      }),
    ).rejects.toThrow('tidak ditemukan')
  })
})

describe('supplier — hutang usaha', () => {
  it('pembelian hutang → sisa utang tercatat, pelunasan parsial mengurangi sisa', async () => {
    const { id: supplierId } = await createSupplier({
      nama: `Supplier-Hutang-${Date.now()}`,
      aktif: true,
    })
    supplierIds.push(supplierId)
    const bahan = await buatBahan()

    const pembelian = await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 10,
      hargaSatuan: 1000,
      supplierId,
      hutang: true,
      catatan: 'kredit 30 hari',
    })
    expect(pembelian.belumDibayar).toBe(10_000)
    expect(pembelian.supplierNama).toContain('Supplier-Hutang')

    const rekap = (await supplierData()).find((s) => s.id === supplierId)
    expect(rekap?.hutang).toBe(10_000)
    expect(rekap?.totalBelanja).toBe(10_000)

    const daftarHutang = await hutangSupplier(supplierId)
    expect(daftarHutang).toHaveLength(1)
    expect(daftarHutang[0]?.belumDibayar).toBe(10_000)

    const bayar = await catatPembayaranHutang({
      pembelianBahanId: pembelian.id,
      jumlah: 4000,
      catatan: 'cicilan 1',
    })
    expect(bayar.belumDibayar).toBe(6000)

    const setelahCicil = (await supplierData()).find((s) => s.id === supplierId)
    expect(setelahCicil?.hutang).toBe(6000)
  })

  it('pembayaran melebihi sisa hutang → ditolak', async () => {
    const { id: supplierId } = await createSupplier({
      nama: `Supplier-Hutang-Lebih-${Date.now()}`,
      aktif: true,
    })
    supplierIds.push(supplierId)
    const bahan = await buatBahan()

    const pembelian = await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 2,
      hargaSatuan: 500,
      supplierId,
      hutang: true,
    })

    await expect(
      catatPembayaranHutang({
        pembelianBahanId: pembelian.id,
        jumlah: 5000,
      }),
    ).rejects.toThrow('melebihi sisa hutang')
  })

  it('pembelian tanpa supplier tidak boleh bertanda hutang', async () => {
    const bahan = await buatBahan()
    await expect(
      pembelianBahan({
        bahanId: bahan.id,
        jumlah: 1,
        hargaSatuan: 100,
        hutang: true,
      }),
    ).rejects.toThrow('Pilih supplier')
  })

  it('supplier nonaktif tidak bisa dipakai untuk pembelian', async () => {
    const { id: supplierId } = await createSupplier({
      nama: `Supplier-Nonaktif-${Date.now()}`,
      aktif: false,
    })
    supplierIds.push(supplierId)
    const bahan = await buatBahan()

    await expect(
      pembelianBahan({
        bahanId: bahan.id,
        jumlah: 1,
        hargaSatuan: 100,
        supplierId,
      }),
    ).rejects.toThrow('nonaktif')
  })

  it('supplier dengan riwayat pembelian tidak bisa dihapus', async () => {
    const { id: supplierId } = await createSupplier({
      nama: `Supplier-Terpakai-${Date.now()}`,
      aktif: true,
    })
    supplierIds.push(supplierId)
    const bahan = await buatBahan()

    await pembelianBahan({
      bahanId: bahan.id,
      jumlah: 1,
      hargaSatuan: 100,
      supplierId,
    })

    await expect(hapusSupplier({ id: supplierId })).rejects.toThrow(
      'riwayat pembelian',
    )
  })
})

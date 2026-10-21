import {
  PembelianBahanQuerySchema,
  PembelianBahanSchema,
} from '#/validations/pembelian-bahan'
import type {
  PembelianBahanInput,
  PembelianBahanQueryInput,
  SumberBelanja,
} from '#/validations/pembelian-bahan'
import type { PembelianBahanRow } from '#/types/pembelian-bahan'

import { prisma } from '#/db'
import { GalatDomain } from './galat.js'

export async function pembelianBahan(
  input: PembelianBahanInput,
): Promise<PembelianBahanRow> {
  const data = PembelianBahanSchema.parse(input)
  const totalHarga = data.jumlah * data.hargaSatuan

  // Supplier wajib ada & aktif agar laporan belanja & hutang konsisten.
  if (data.supplierId) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
      select: { aktif: true },
    })
    if (!supplier) throw new GalatDomain('Supplier tidak ditemukan')
    if (!supplier.aktif) throw new GalatDomain('Supplier sedang nonaktif')
  }

  // Sumber belanja ditentukan server: ada supplier → SUPPLIER; tanpa supplier →
  // pasar online/offline (nilai dari klien, sudah divalidasi skema).
  const sumberBelanja = data.supplierId ? 'SUPPLIER' : data.sumberBelanja
  const tempatBelanja = data.supplierId ? null : (data.tempatBelanja ?? null)

  return await prisma.$transaction(async (tx) => {
    const pembelian = await tx.pembelianBahan.create({
      data: {
        bahanId: data.bahanId,
        supplierId: data.supplierId ?? null,
        jumlah: data.jumlah,
        hargaSatuan: data.hargaSatuan,
        totalHarga,
        catatan: data.catatan ?? null,
        // Pembelian hutang = seluruh nominal masih terutang ke supplier.
        belumDibayar: data.hutang ? totalHarga : 0,
        sumberBelanja,
        tempatBelanja,
      },
      include: {
        bahan: { select: { nama: true } },
        supplier: { select: { nama: true } },
      },
    })

    await tx.bahan.update({
      where: { id: data.bahanId },
      data: {
        stok: { increment: data.jumlah },
        hargaSatuan: data.hargaSatuan,
      },
    })

    return {
      id: pembelian.id,
      bahanNama: pembelian.bahan.nama,
      bahanId: pembelian.bahanId,
      jumlah: pembelian.jumlah.toNumber(),
      hargaSatuan: pembelian.hargaSatuan.toNumber(),
      totalHarga: pembelian.totalHarga.toNumber(),
      tanggal: pembelian.tanggal.toISOString(),
      catatan: pembelian.catatan,
      supplierId: pembelian.supplierId,
      supplierNama: pembelian.supplier?.nama ?? null,
      belumDibayar: pembelian.belumDibayar.toNumber(),
      sumberBelanja: pembelian.sumberBelanja as SumberBelanja,
      tempatBelanja: pembelian.tempatBelanja,
    }
  })
}

export async function daftarPembelianBahan(
  input: PembelianBahanQueryInput,
): Promise<PembelianBahanRow[]> {
  const data = PembelianBahanQuerySchema.parse(input)
  const pembelian = await prisma.pembelianBahan.findMany({
    where: {
      ...(data.bahanId && { bahanId: data.bahanId }),
      ...(data.supplierId && { supplierId: data.supplierId }),
      ...(data.sumberBelanja && { sumberBelanja: data.sumberBelanja }),
      ...(data.dari && { tanggal: { gte: new Date(`${data.dari}T00:00:00`) } }),
      ...(data.sampai && {
        tanggal: { lte: new Date(`${data.sampai}T23:59:59.999`) },
      }),
    },
    include: {
      bahan: { select: { nama: true } },
      supplier: { select: { nama: true } },
    },
    orderBy: { tanggal: 'desc' },
  })
  return pembelian.map((p) => ({
    id: p.id,
    bahanNama: p.bahan.nama,
    jumlah: p.jumlah.toNumber(),
    hargaSatuan: p.hargaSatuan.toNumber(),
    totalHarga: p.totalHarga.toNumber(),
    tanggal: p.tanggal.toISOString(),
    catatan: p.catatan,
    supplierId: p.supplierId,
    supplierNama: p.supplier?.nama ?? null,
    belumDibayar: p.belumDibayar.toNumber(),
    sumberBelanja: p.sumberBelanja as SumberBelanja,
    tempatBelanja: p.tempatBelanja,
  }))
}

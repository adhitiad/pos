import { prisma } from '#/db'
import { catatAudit, selisihField } from './audit.js'
import { GalatDomain } from './galat.js'
import {
  HapusSupplierSchema,
  PembayaranHutangSchema,
  SupplierInputSchema,
  UpdateSupplierSchema,
} from '#/validations/supplier'
import type {
  PembayaranHutangInput,
  SupplierInput,
  UpdateSupplierInput,
} from '#/validations/supplier'
import type { HutangPembelianRow, SupplierRow } from '#/types/supplier'

const kosongKeNull = (v: string | undefined) =>
  v === undefined || v.trim() === '' ? null : v.trim()

// Daftar supplier beserta rekap belanja & hutangnya. Agregat diambil lewat
// groupBy supaya tidak menarik seluruh baris pembelian ke memori.
export async function supplierData(): Promise<SupplierRow[]> {
  const [supplier, agregat] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
        kontak: true,
        alamat: true,
        catatan: true,
        aktif: true,
      },
    }),
    prisma.pembelianBahan.groupBy({
      by: ['supplierId'],
      _sum: { totalHarga: true, belumDibayar: true },
      _count: { _all: true },
    }),
  ])

  const peta = new Map(
    agregat
      .filter((a) => a.supplierId)
      .map((a) => [
        a.supplierId as string,
        {
          jumlah: a._count._all,
          total: a._sum.totalHarga?.toNumber() ?? 0,
          hutang: a._sum.belumDibayar?.toNumber() ?? 0,
        },
      ]),
  )

  return supplier.map((s) => {
    const rekap = peta.get(s.id)
    return {
      id: s.id,
      nama: s.nama,
      kontak: s.kontak,
      alamat: s.alamat,
      catatan: s.catatan,
      aktif: s.aktif,
      jumlahPembelian: rekap?.jumlah ?? 0,
      totalBelanja: rekap?.total ?? 0,
      hutang: rekap?.hutang ?? 0,
    }
  })
}

// Daftar ringkas supplier aktif — dipakai form pembelian bahan.
export async function supplierOpsi(): Promise<{ id: string; nama: string }[]> {
  return await prisma.supplier.findMany({
    where: { aktif: true },
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true },
  })
}

export async function createSupplier(
  input: SupplierInput,
  aktorId?: string,
): Promise<{ id: string }> {
  const data = SupplierInputSchema.parse(input)
  const supplier = await prisma.supplier.create({
    data: {
      nama: data.nama,
      kontak: kosongKeNull(data.kontak),
      alamat: kosongKeNull(data.alamat),
      catatan: kosongKeNull(data.catatan),
      aktif: data.aktif,
    },
    select: { id: true },
  })
  await catatAudit({
    aktorId,
    aksi: 'supplier.buat',
    entitas: 'Supplier',
    entitasId: supplier.id,
    sesudah: {
      nama: data.nama,
      kontak: kosongKeNull(data.kontak),
      aktif: data.aktif,
    },
  })
  return supplier
}

export async function updateSupplier(
  input: UpdateSupplierInput,
  aktorId?: string,
): Promise<{ id: string }> {
  const data = UpdateSupplierSchema.parse(input)
  const lama = await prisma.supplier.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Supplier tidak ditemukan')

  await prisma.supplier.update({
    where: { id: data.id },
    data: {
      nama: data.nama,
      kontak: kosongKeNull(data.kontak),
      alamat: kosongKeNull(data.alamat),
      catatan: kosongKeNull(data.catatan),
      aktif: data.aktif,
    },
  })

  const selisih = selisihField(
    {
      nama: lama.nama,
      kontak: lama.kontak,
      alamat: lama.alamat,
      catatan: lama.catatan,
      aktif: lama.aktif,
    },
    {
      nama: data.nama,
      kontak: kosongKeNull(data.kontak),
      alamat: kosongKeNull(data.alamat),
      catatan: kosongKeNull(data.catatan),
      aktif: data.aktif,
    },
  )
  if (Object.keys(selisih.sesudah).length > 0) {
    await catatAudit({
      aktorId,
      aksi: 'supplier.ubah',
      entitas: 'Supplier',
      entitasId: data.id,
      sebelum: selisih.sebelum,
      sesudah: selisih.sesudah,
    })
  }
  return { id: data.id }
}

// Supplier yang sudah punya riwayat pembelian / hutang tidak boleh dihapus
// agar laporan belanja & hutang tetap konsisten.
export async function hapusSupplier(
  input: { id: string },
  aktorId?: string,
): Promise<{ id: string }> {
  const data = HapusSupplierSchema.parse(input)
  const lama = await prisma.supplier.findUnique({
    where: { id: data.id },
    include: { _count: { select: { pembelian: true } } },
  })
  if (!lama) throw new GalatDomain('Supplier tidak ditemukan')
  if (lama._count.pembelian > 0) {
    throw new GalatDomain(
      `Supplier punya ${lama._count.pembelian} riwayat pembelian — nonaktifkan saja`,
    )
  }
  await prisma.supplier.delete({ where: { id: data.id } })
  await catatAudit({
    aktorId,
    aksi: 'supplier.hapus',
    entitas: 'Supplier',
    entitasId: data.id,
    sesudah: { nama: lama.nama, kontak: lama.kontak },
  })
  return { id: data.id }
}

// Daftar pembelian yang masih punya sisa hutang untuk satu supplier.
export async function hutangSupplier(
  supplierId: string,
): Promise<HutangPembelianRow[]> {
  const pembelian = await prisma.pembelianBahan.findMany({
    where: { supplierId, belumDibayar: { gt: 0 } },
    orderBy: { tanggal: 'asc' },
    select: {
      id: true,
      tanggal: true,
      totalHarga: true,
      belumDibayar: true,
      bahan: { select: { nama: true } },
    },
  })
  return pembelian.map((p) => ({
    pembelianBahanId: p.id,
    tanggal: p.tanggal.toISOString(),
    bahanNama: p.bahan.nama,
    totalHarga: p.totalHarga.toNumber(),
    belumDibayar: p.belumDibayar.toNumber(),
  }))
}

// Catat pelunasan hutang: kurangi sisa hutang pembelian & simpan riwayat
// pembayaran. Nominal tidak boleh melebihi sisa hutang.
export async function catatPembayaranHutang(
  input: PembayaranHutangInput,
  aktorId?: string,
): Promise<{ id: string; supplierId: string; belumDibayar: number }> {
  const data = PembayaranHutangSchema.parse(input)
  const pembelian = await prisma.pembelianBahan.findUnique({
    where: { id: data.pembelianBahanId },
    select: {
      id: true,
      supplierId: true,
      totalHarga: true,
      belumDibayar: true,
      bahan: { select: { nama: true } },
      supplier: { select: { nama: true } },
    },
  })
  if (!pembelian) throw new GalatDomain('Data pembelian tidak ditemukan')
  if (!pembelian.supplierId)
    throw new GalatDomain('Pembelian ini tidak punya supplier')
  const sisa = pembelian.belumDibayar.toNumber()
  if (sisa <= 0) throw new GalatDomain('Pembelian ini sudah lunas')
  if (data.jumlah > sisa) {
    throw new GalatDomain(
      `Nominal melebihi sisa hutang (${sisa.toLocaleString('id-ID')})`,
    )
  }

  const hasil = await prisma.$transaction(async (tx) => {
    const bayar = await tx.pembayaranHutang.create({
      data: {
        supplierId: pembelian.supplierId as string,
        pembelianBahanId: pembelian.id,
        jumlah: data.jumlah,
        catatan: kosongKeNull(data.catatan),
      },
      select: { id: true },
    })
    await tx.pembelianBahan.update({
      where: { id: pembelian.id },
      data: { belumDibayar: { decrement: data.jumlah } },
    })
    return bayar
  })

  await catatAudit({
    aktorId,
    aksi: 'supplier.hutang.bayar',
    entitas: 'PembelianBahan',
    entitasId: pembelian.id,
    sebelum: { belumDibayar: sisa },
    sesudah: { belumDibayar: sisa - data.jumlah },
  })

  return {
    id: hasil.id,
    supplierId: pembelian.supplierId,
    belumDibayar: sisa - data.jumlah,
  }
}

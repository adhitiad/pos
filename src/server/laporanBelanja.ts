import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import { GalatDomain } from './galat.js'
import { LaporanBelanjaSchema } from '#/validations/laporan-belanja'
import type { LaporanBelanjaInput } from '#/validations/laporan-belanja'
import type { SumberBelanja } from '#/validations/pembelian-bahan'
import type { LaporanBelanjaOutput } from '#/types/laporan'

export type { LaporanBelanjaOutput } from '#/types/laporan'

// Nama tampilan sumber belanja: supplier, pasar online, atau pasar offline.
export function labelSumberBelanja(
  sumber: SumberBelanja,
  supplierNama: string | null,
): string {
  if (supplierNama) return supplierNama
  if (sumber === 'PASAR_ONLINE') return 'Pasar Online'
  if (sumber === 'PASAR_OFFLINE') return 'Pasar Offline'
  return 'Tanpa sumber'
}

// Laporan belanja bahan: rekap per sumber (supplier/pasar), per bulan, dan
// detail transaksi pembelian. Data diambil dari PembelianBahan (sumber
// kebenaran stok masuk).
export async function laporanBelanja(
  input: LaporanBelanjaInput,
): Promise<LaporanBelanjaOutput> {
  const data = LaporanBelanjaSchema.parse(input)
  const awal = new Date(`${data.dari}T00:00:00`)
  const akhir = new Date(`${data.sampai}T23:59:59.999`)
  if (akhir < awal) throw new GalatDomain('Rentang tanggal tidak valid')

  const where = {
    tanggal: { gte: awal, lte: akhir },
    ...(data.supplierId && { supplierId: data.supplierId }),
    ...(data.sumberBelanja && { sumberBelanja: data.sumberBelanja }),
  }

  const [perSumberAgg, perBulanAgg, pembelian] = await Promise.all([
    // Rekap per sumber diagregasi SQL (jumlah, total, hutang).
    prisma.pembelianBahan.groupBy({
      by: ['supplierId', 'sumberBelanja'],
      where,
      _sum: { totalHarga: true, belumDibayar: true },
      _count: { _all: true },
    }),
    // Rekap bulanan diagregasi SQL di zona waktu laporan.
    prisma.$queryRaw<
      Array<{ periode: string; total: Prisma.Decimal }>
    >(Prisma.sql`
      SELECT to_char(
               ("tanggal" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta',
               'YYYY-MM'
             ) AS "periode",
             SUM("totalHarga") AS "total"
      FROM "PembelianBahan"
      WHERE "tanggal" BETWEEN ${awal} AND ${akhir}
        ${data.supplierId ? Prisma.sql`AND "supplierId" = ${data.supplierId}` : Prisma.empty}
        ${data.sumberBelanja ? Prisma.sql`AND "sumberBelanja" = ${data.sumberBelanja}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    prisma.pembelianBahan.findMany({
      where,
      orderBy: { tanggal: 'asc' },
      select: {
        id: true,
        tanggal: true,
        jumlah: true,
        hargaSatuan: true,
        totalHarga: true,
        belumDibayar: true,
        catatan: true,
        sumberBelanja: true,
        tempatBelanja: true,
        supplier: { select: { id: true, nama: true } },
        bahan: { select: { nama: true } },
      },
    }),
  ])

  // Nama supplier untuk rekap per sumber.
  const idSuppliers = [
    ...new Set(
      perSumberAgg
        .map((g) => g.supplierId)
        .filter((id): id is string => id != null),
    ),
  ]
  const suppliers =
    idSuppliers.length > 0
      ? await prisma.supplier.findMany({
          where: { id: { in: idSuppliers } },
          select: { id: true, nama: true },
        })
      : []
  const namaSupplier = new Map(suppliers.map((s) => [s.id, s.nama]))

  let totalBelanja = 0
  let totalHutang = 0
  const perSumber = perSumberAgg
    .map((g) => {
      const sumber = g.sumberBelanja as SumberBelanja
      const total = g._sum.totalHarga?.toNumber() ?? 0
      const hutang = g._sum.belumDibayar?.toNumber() ?? 0
      totalBelanja += total
      totalHutang += hutang
      return {
        supplierId: g.supplierId ?? null,
        sumberBelanja: sumber,
        nama: labelSumberBelanja(
          sumber,
          g.supplierId ? (namaSupplier.get(g.supplierId) ?? null) : null,
        ),
        jumlah: g._count._all,
        total,
        hutang,
      }
    })
    .sort((a, b) => b.total - a.total)

  return {
    dari: data.dari,
    sampai: data.sampai,
    totalBelanja,
    jumlahPembelian: pembelian.length,
    totalHutang,
    perSumber,
    perBulan: perBulanAgg.map((b) => ({
      periode: b.periode,
      total: b.total.toNumber(),
    })),
    detail: pembelian.map((p) => ({
      id: p.id,
      tanggal: p.tanggal.toISOString(),
      sumberBelanja: p.sumberBelanja as SumberBelanja,
      supplierNama: p.supplier?.nama ?? null,
      tempatBelanja: p.tempatBelanja,
      bahanNama: p.bahan.nama,
      jumlah: p.jumlah.toNumber(),
      hargaSatuan: p.hargaSatuan.toNumber(),
      totalHarga: p.totalHarga.toNumber(),
      belumDibayar: p.belumDibayar.toNumber(),
      catatan: p.catatan,
    })),
  }
}

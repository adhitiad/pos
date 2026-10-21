import { prisma } from '#/db'
import { GalatDomain } from './galat.js'
import { LaporanBelanjaSchema } from '#/validations/laporan-belanja'
import type { LaporanBelanjaInput } from '#/validations/laporan-belanja'
import type { SumberBelanja } from '#/validations/pembelian-bahan'

export interface LaporanBelanjaOutput {
  dari: string
  sampai: string
  /** Total nilai pembelian bahan pada periode. */
  totalBelanja: number
  jumlahPembelian: number
  /** Sisa hutang usaha yang belum dibayar (dari pembelian periode ini). */
  totalHutang: number
  /** Rekap per sumber belanja: supplier terdaftar atau pasar online/offline. */
  perSumber: {
    /** Id supplier (null untuk pembelian pasar). */
    supplierId: string | null
    sumberBelanja: SumberBelanja
    nama: string
    jumlah: number
    total: number
    hutang: number
  }[]
  perBulan: { periode: string; total: number }[]
  detail: {
    id: string
    tanggal: string
    sumberBelanja: SumberBelanja
    /** Nama supplier (bila ada). */
    supplierNama: string | null
    /** Nama pasar/toko (bila pembelian ke pasar). */
    tempatBelanja: string | null
    bahanNama: string
    jumlah: number
    hargaSatuan: number
    totalHarga: number
    belumDibayar: number
    catatan: string | null
  }[]
}

const periodeBulan = (tgl: Date): string =>
  `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}`

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

  const pembelian = await prisma.pembelianBahan.findMany({
    where: {
      tanggal: { gte: awal, lte: akhir },
      ...(data.supplierId && { supplierId: data.supplierId }),
      ...(data.sumberBelanja && { sumberBelanja: data.sumberBelanja }),
    },
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
  })

  const perSumber = new Map<
    string,
    {
      supplierId: string | null
      sumberBelanja: SumberBelanja
      nama: string
      jumlah: number
      total: number
      hutang: number
    }
  >()
  const perBulan = new Map<string, number>()
  let totalBelanja = 0
  let totalHutang = 0

  for (const p of pembelian) {
    const total = p.totalHarga.toNumber()
    const hutang = p.belumDibayar.toNumber()
    const sumber = p.sumberBelanja as SumberBelanja
    totalBelanja += total
    totalHutang += hutang

    // Supplier punya id sendiri; pembelian pasar dikelompokkan per jenis pasar.
    const kunciSumber = p.supplier?.id ?? `pasar:${sumber}`
    const rekap = perSumber.get(kunciSumber)
    if (rekap) {
      rekap.jumlah += 1
      rekap.total += total
      rekap.hutang += hutang
    } else {
      perSumber.set(kunciSumber, {
        supplierId: p.supplier?.id ?? null,
        sumberBelanja: sumber,
        nama: labelSumberBelanja(sumber, p.supplier?.nama ?? null),
        jumlah: 1,
        total,
        hutang,
      })
    }

    const bulan = periodeBulan(p.tanggal)
    perBulan.set(bulan, (perBulan.get(bulan) ?? 0) + total)
  }

  return {
    dari: data.dari,
    sampai: data.sampai,
    totalBelanja,
    jumlahPembelian: pembelian.length,
    totalHutang,
    perSumber: [...perSumber.values()].sort((a, b) => b.total - a.total),
    perBulan: [...perBulan.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periode, total]) => ({ periode, total })),
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

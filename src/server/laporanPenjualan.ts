import { prisma } from '#/db'
import { GalatDomain } from './galat.js'
import { LaporanPenjualanSchema } from '#/validations/laporan-penjualan'
import type {
  Grup,
  LaporanPenjualanInput,
} from '#/validations/laporan-penjualan'
import type {
  BarisTransaksi,
  LaporanPenjualan,
  PerformaKasir,
  ProdukTerlaris,
  RekapRow,
  Ringkasan,
} from '#/types/laporan-penjualan'
import { FILTER_TRANSAKSI_TERJUAL } from './transaksiTerjual.js'

// ─── Fungsi murni (diuji di tests/laporan.test.ts) ───

export { keCsv } from './csv.js'

// Nomor minggu ISO-8601 (Senin = awal minggu).
export function isoWeek(tgl: Date): { tahun: number; minggu: number } {
  const d = new Date(Date.UTC(tgl.getFullYear(), tgl.getMonth(), tgl.getDate()))
  const hari = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - hari)
  const awalTahun = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const minggu = Math.ceil(
    ((d.getTime() - awalTahun.getTime()) / 86_400_000 + 1) / 7,
  )
  return { tahun: d.getUTCFullYear(), minggu }
}

// Kunci periode untuk pengelompokan rekap.
export function kunciPeriode(tgl: Date, grup: Grup): string {
  const y = tgl.getFullYear()
  const m = String(tgl.getMonth() + 1).padStart(2, '0')
  const d = String(tgl.getDate()).padStart(2, '0')
  if (grup === 'bulanan') return `${y}-${m}`
  if (grup === 'mingguan') {
    const { tahun, minggu } = isoWeek(tgl)
    return `${tahun}-W${String(minggu).padStart(2, '0')}`
  }
  return `${y}-${m}-${d}`
}

// omzet = subtotal − diskon (pendapatan barang); total = yang dibayar pelanggan.
const omzetBaris = (b: BarisTransaksi) => b.subtotal - b.diskon

export function bangunRekap(baris: BarisTransaksi[], grup: Grup): RekapRow[] {
  const peta = new Map<string, RekapRow>()
  for (const b of baris) {
    const periode = kunciPeriode(b.tanggal, grup)
    if (!peta.has(periode)) {
      peta.set(periode, {
        periode,
        jumlahTransaksi: 0,
        omzet: 0,
        hpp: 0,
        labaKotor: 0,
        total: 0,
      })
    }
    const cur = peta.get(periode)!
    const omzet = omzetBaris(b)
    cur.jumlahTransaksi += 1
    cur.omzet += omzet
    cur.hpp += b.hpp
    cur.labaKotor += omzet - b.hpp
    cur.total += b.total
  }
  return [...peta.values()].sort((a, b) => a.periode.localeCompare(b.periode))
}

export function ringkasBaris(baris: BarisTransaksi[]): Ringkasan {
  const r: Ringkasan = {
    jumlahTransaksi: 0,
    subtotal: 0,
    diskon: 0,
    pajak: 0,
    ongkir: 0,
    total: 0,
    omzet: 0,
    hpp: 0,
    labaKotor: 0,
  }
  for (const b of baris) {
    const omzet = omzetBaris(b)
    r.jumlahTransaksi += 1
    r.subtotal += b.subtotal
    r.diskon += b.diskon
    r.pajak += b.pajak
    r.ongkir += b.ongkir
    r.total += b.total
    r.omzet += omzet
    r.hpp += b.hpp
    r.labaKotor += omzet - b.hpp
  }
  return r
}

// ─── Kueri + agregasi ───

export async function laporanPenjualan(
  input: LaporanPenjualanInput,
): Promise<LaporanPenjualan> {
  const data = LaporanPenjualanSchema.parse(input)
  const awal = new Date(`${data.dari}T00:00:00`)
  const akhir = new Date(`${data.sampai}T23:59:59.999`)
  if (akhir < awal) throw new GalatDomain('Rentang tanggal tidak valid')

  const rentang = { tanggal: { gte: awal, lte: akhir } }
  const filterTerjual = { ...rentang, ...FILTER_TRANSAKSI_TERJUAL }
  const [transaksi, produk, hppGroup, produkGroup, kasirGroup] =
    await Promise.all([
      prisma.transaksi.findMany({
        where: filterTerjual,
        orderBy: { tanggal: 'asc' },
        select: {
          id: true,
          tanggal: true,
          subtotal: true,
          diskon: true,
          pajak: true,
          ongkir: true,
          total: true,
          kasirId: true,
        },
      }),
      prisma.produk.findMany({
        select: {
          id: true,
          resep: {
            select: { jumlah: true, bahan: { select: { hargaSatuan: true } } },
          },
        },
      }),
      // Item diagregasi di SQL, bukan di JS.
      prisma.transaksiItem.groupBy({
        by: ['transaksiId', 'produkId'],
        where: { transaksi: filterTerjual },
        _sum: { qty: true },
      }),
      prisma.transaksiItem.groupBy({
        by: ['produkId', 'namaProduk'],
        where: { transaksi: filterTerjual },
        _sum: { qty: true, subtotal: true },
      }),
      prisma.transaksi.groupBy({
        by: ['kasirId'],
        where: filterTerjual,
        _sum: { total: true },
        _count: { _all: true },
      }),
    ])

  // HPP per produk dari resep (harga bahan saat ini).
  const cogs = new Map<string, number>()
  for (const p of produk) {
    let c = 0
    for (const r of p.resep) {
      c += r.jumlah.toNumber() * r.bahan.hargaSatuan.toNumber()
    }
    cogs.set(p.id, c)
  }

  // HPP per transaksi dari resep (dibulatkan per produk, seperti sebelumnya).
  const hppPerTransaksi = new Map<string, number>()
  for (const g of hppGroup) {
    const c = g.produkId ? (cogs.get(g.produkId) ?? 0) : 0
    const hpp = Math.round(c * (g._sum.qty ?? 0))
    hppPerTransaksi.set(
      g.transaksiId,
      (hppPerTransaksi.get(g.transaksiId) ?? 0) + hpp,
    )
  }

  const baris: BarisTransaksi[] = transaksi.map((t) => ({
    tanggal: t.tanggal,
    subtotal: t.subtotal.toNumber(),
    diskon: t.diskon.toNumber(),
    pajak: t.pajak.toNumber(),
    ongkir: t.ongkir.toNumber(),
    total: t.total.toNumber(),
    hpp: hppPerTransaksi.get(t.id) ?? 0,
  }))

  // Gabungkan kembali per produkId (produk yang diganti nama tetap satu baris).
  const petaProduk = new Map<string, ProdukTerlaris>()
  for (const g of produkGroup) {
    const kunci = g.produkId ?? `nama:${g.namaProduk}`
    const cur = petaProduk.get(kunci) ?? {
      produkId: g.produkId,
      nama: g.namaProduk,
      qty: 0,
      omzet: 0,
    }
    cur.qty += g._sum.qty ?? 0
    cur.omzet += g._sum.subtotal?.toNumber() ?? 0
    petaProduk.set(kunci, cur)
  }

  const idKasir = kasirGroup
    .map((g) => g.kasirId)
    .filter((id): id is string => id != null)
  const akunKasir =
    idKasir.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: idKasir } },
          select: { id: true, name: true },
        })
      : []
  const namaKasir = new Map(akunKasir.map((u) => [u.id, u.name]))

  const produkTerlaris = [...petaProduk.values()]
    .sort((a, b) => b.qty - a.qty || b.omzet - a.omzet)
    .slice(0, 20)

  const performaKasir: PerformaKasir[] = kasirGroup
    .map((g) => ({
      kasirId: g.kasirId,
      nama: g.kasirId
        ? (namaKasir.get(g.kasirId) ?? 'Tanpa kasir')
        : 'Tanpa kasir',
      jumlahTransaksi: g._count._all,
      omzet: g._sum.total?.toNumber() ?? 0,
    }))
    .sort((a, b) => b.omzet - a.omzet)

  return {
    dari: data.dari,
    sampai: data.sampai,
    grup: data.grup,
    ringkasan: ringkasBaris(baris),
    rekap: bangunRekap(baris, data.grup),
    produkTerlaris,
    performaKasir,
  }
}

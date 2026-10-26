import { prisma } from '#/db'
import { GalatDomain } from './galat.js'
import { LaporanPenjualanSchema } from '#/validations/laporan-penjualan'
import type {
  Grup,
  Dimensi,
  LaporanPenjualanInput,
} from '#/validations/laporan-penjualan'
import type {
  BarisTransaksi,
  LaporanPenjualan,
  PerformaKasir,
  ProdukTerlaris,
  RekapDimensi,
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
  if (grup === 'tahunan') return `${y}`
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

export function bangunRekapDimensi(
  baris: BarisTransaksi[],
  dimensi: Dimensi,
): RekapDimensi[] {
  const peta = new Map<string, RekapDimensi>()
  for (const b of baris) {
    const kunci = ambilNilaiDimensi(b, dimensi)
    const label = ambilLabelDimensi(b, dimensi)
    if (!peta.has(kunci)) {
      peta.set(kunci, {
        dimensi,
        kunci,
        label,
        jumlahTransaksi: 0,
        omzet: 0,
        total: 0,
      })
    }
    const cur = peta.get(kunci)!
    const omzet = omzetBaris(b)
    cur.jumlahTransaksi += 1
    cur.omzet += omzet
    cur.total += b.total
  }
  return [...peta.values()].sort((a, b) => b.omzet - a.omzet)
}

function ambilNilaiDimensi(b: BarisTransaksi, dimensi: Dimensi): string {
  switch (dimensi) {
    case 'kategori':
      return b.kategoriId ?? 'tanpa-kategori'
    case 'kasir':
      return b.kasirId ?? 'tanpa-kasir'
    case 'shift':
      return b.shiftId ?? 'tanpa-shift'
    case 'member':
      return b.memberId ?? 'non-member'
    case 'metodeBayar':
      return b.metodeBayar
    case 'meja':
      return b.mejaId ?? 'tanpa-meja'
    case 'delivery':
      return b.deliveryId ?? 'tanpa-delivery'
    case 'sumber':
      return b.sumber
    case 'statusPesanan':
      return b.statusPesanan
    case 'pajakJenis':
      return b.pajakJenis ?? 'tanpa-pajak'
    default:
      return 'lainnya'
  }
}

function ambilLabelDimensi(b: BarisTransaksi, dimensi: Dimensi): string {
  switch (dimensi) {
    case 'kategori':
      return b.kategoriNama ?? 'Tanpa Kategori'
    case 'kasir':
      return b.kasirId ? `Kasir ${b.kasirId.slice(0, 8)}` : 'Tanpa Kasir'
    case 'shift':
      return b.shiftId ? `Shift ${b.shiftId.slice(0, 8)}` : 'Tanpa Shift'
    case 'member':
      return b.memberId ? `Member ${b.memberId.slice(0, 8)}` : 'Non-Member'
    case 'metodeBayar':
      return b.metodeBayar
    case 'meja':
      return b.mejaId ? `Meja ${b.mejaId.slice(0, 8)}` : 'Tanpa Meja'
    case 'delivery':
      return b.deliveryId
        ? `Delivery ${b.deliveryId.slice(0, 8)}`
        : 'Tanpa Delivery'
    case 'sumber':
      return b.sumber === 'POS' ? 'POS' : 'Online'
    case 'statusPesanan':
      return b.statusPesanan
    case 'pajakJenis':
      return b.pajakJenis ?? 'Tanpa Pajak'
    default:
      return 'Lainnya'
  }
}

export function ringkasBaris(baris: BarisTransaksi[]): Ringkasan {
  const r: Ringkasan = {
    jumlahTransaksi: 0,
    qtyTerjual: 0,
    subtotal: 0,
    diskon: 0,
    pajak: 0,
    ongkir: 0,
    total: 0,
    omzet: 0,
    hpp: 0,
    labaKotor: 0,
    poinTerpakai: 0,
    poinDapat: 0,
  }
  for (const b of baris) {
    const omzet = omzetBaris(b)
    r.jumlahTransaksi += 1
    r.qtyTerjual += b.qtyTerjual
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

  // Bangun where clause dengan filter dimensi opsional.
  const where: Record<string, unknown> = { ...filterTerjual }
  if (data.kategoriId) {
    where.items = {
      some: { produk: { kategoriId: data.kategoriId } },
    }
  }
  if (data.kasirId) where.kasirId = data.kasirId
  if (data.shiftId) where.shiftId = data.shiftId
  if (data.memberId) where.memberId = data.memberId
  if (data.metodeBayar) where.metodeBayar = data.metodeBayar
  if (data.mejaId) where.mejaId = data.mejaId
  if (data.deliveryId) where.deliveryId = data.deliveryId
  if (data.sumber) where.sumber = data.sumber
  if (data.statusPesanan) where.statusPesanan = data.statusPesanan
  if (data.pajakJenis) where.pajakJenis = data.pajakJenis

  const [transaksi, produk, produkGroup, kasirGroup] = await Promise.all([
    prisma.transaksi.findMany({
      where,
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
        shiftId: true,
        memberId: true,
        metodeBayar: true,
        mejaId: true,
        deliveryId: true,
        sumber: true,
        statusPesanan: true,
        pajakJenis: true,
        items: {
          select: {
            produk: {
              select: {
                id: true,
                nama: true,
                kategoriId: true,
                kategori: { select: { id: true, nama: true } },
              },
            },
            qty: true,
            subtotal: true,
          },
        },
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
    prisma.transaksiItem.groupBy({
      by: ['produkId', 'namaProduk'],
      where: { transaksi: where },
      _sum: { qty: true, subtotal: true },
    }),
    prisma.transaksi.groupBy({
      by: ['kasirId'],
      where,
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

  // HPP & qty per transaksi langsung dari items yang telah dimuat.
  const hppPerTransaksi = new Map<string, number>()
  const qtyPerTransaksi = new Map<string, number>()
  for (const t of transaksi) {
    let hpp = 0
    let qty = 0
    for (const it of t.items) {
      const c = it.produk ? (cogs.get(it.produk.id) ?? 0) : 0
      hpp += c * it.qty
      qty += it.qty
    }
    hppPerTransaksi.set(t.id, Math.round(hpp))
    qtyPerTransaksi.set(t.id, qty)
  }

  const baris: BarisTransaksi[] = transaksi.map((t) => {
    // Ambil kategori dari item pertama (produk yang diganti nama tetap satu baris).
    const firstItem = t.items[0]
    const produkItem = firstItem.produk
    const kategoriId = produkItem?.kategoriId ?? null
    const kategoriNama = produkItem?.kategori?.nama ?? null
    return {
      tanggal: t.tanggal,
      subtotal: t.subtotal.toNumber(),
      diskon: t.diskon.toNumber(),
      pajak: t.pajak.toNumber(),
      ongkir: t.ongkir.toNumber(),
      total: t.total.toNumber(),
      hpp: hppPerTransaksi.get(t.id) ?? 0,
      qtyTerjual: qtyPerTransaksi.get(t.id) ?? 0,
      kategoriId,
      kategoriNama,
      kasirId: t.kasirId,
      shiftId: t.shiftId,
      memberId: t.memberId,
      metodeBayar: t.metodeBayar,
      mejaId: t.mejaId,
      deliveryId: t.deliveryId,
      sumber: t.sumber,
      statusPesanan: t.statusPesanan,
      pajakJenis: t.pajakJenis,
    }
  })

  const ringkasan = ringkasBaris(baris)

  const rekap = bangunRekap(baris, data.grup)

  let rekapDimensi: RekapDimensi[] | undefined
  if (data.dimensi) {
    rekapDimensi = bangunRekapDimensi(baris, data.dimensi)
  }

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

  const produkTerlaris = [...petaProduk.values()]
    .sort((a, b) => b.qty - a.qty || b.omzet - a.omzet)
    .slice(0, 20)

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
    dimensi: data.dimensi,
    ringkasan,
    rekap,
    rekapDimensi,
    produkTerlaris,
    performaKasir,
  }
}

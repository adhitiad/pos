import { prisma } from '#/db'
import { FILTER_TRANSAKSI_TERJUAL } from './transaksiTerjual.js'
import type {
  Notifikasi,
  NotifikasiPendapatan,
  NotifikasiPengajuan,
  NotifikasiPesanan,
  OpsiNotifikasi,
  PeriodeNotifikasi,
  PeriodePendapatan,
} from '#/types/notifikasi'
import { notifikasiTersimpan } from './notifikasiPesan.js'

export type { OpsiNotifikasi } from '#/types/notifikasi'

const duaDigit = (n: number) => String(n).padStart(2, '0')

const tanggalLokal = (d: Date) =>
  `${d.getFullYear()}-${duaDigit(d.getMonth() + 1)}-${duaDigit(d.getDate())}`

const geserHari = (d: Date, jumlah: number) => {
  const hasil = new Date(d)
  hasil.setDate(hasil.getDate() + jumlah)
  return hasil
}

const awalHari = (d: Date) => {
  const hasil = new Date(d)
  hasil.setHours(0, 0, 0, 0)
  return hasil
}

const awalMinggu = (d: Date) => {
  const hasil = awalHari(d)
  hasil.setDate(hasil.getDate() - ((hasil.getDay() + 6) % 7))
  return hasil
}

const namaPelangganDariCatatan = (catatan: string | null) => {
  const cocok = catatan?.match(/(?:^|\n)Pelanggan:\s*(.+)$/im)
  return cocok?.[1]?.trim() || null
}

export function periodeNotifikasi(sekarang = new Date()) {
  const besok = geserHari(awalHari(sekarang), 1)
  const mingguIni = awalMinggu(sekarang)
  const mingguLalu = geserHari(mingguIni, -7)
  const bulanIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)
  const bulanLalu = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1)

  return {
    harian: {
      awal: awalHari(sekarang),
      akhir: besok,
      labelDari: tanggalLokal(sekarang),
      labelSampai: tanggalLokal(sekarang),
    } satisfies PeriodeNotifikasi,
    mingguan: {
      awal: mingguLalu,
      akhir: mingguIni,
      labelDari: tanggalLokal(mingguLalu),
      labelSampai: tanggalLokal(geserHari(mingguIni, -1)),
    } satisfies PeriodeNotifikasi,
    bulanan: {
      awal: bulanLalu,
      akhir: bulanIni,
      labelDari: tanggalLokal(bulanLalu),
      labelSampai: tanggalLokal(geserHari(bulanIni, -1)),
    } satisfies PeriodeNotifikasi,
    tampilkanMingguan: sekarang.getDay() === 1,
    tampilkanBulanan: sekarang.getDate() === 1,
  }
}

async function ringkasPendapatan(periode: PeriodeNotifikasi) {
  const hasil = await prisma.transaksi.aggregate({
    where: {
      tanggal: { gte: periode.awal, lt: periode.akhir },
      ...FILTER_TRANSAKSI_TERJUAL,
    },
    _sum: { total: true },
    _count: { id: true },
  })
  return {
    total: hasil._sum.total?.toNumber() ?? 0,
    jumlahTransaksi: hasil._count.id,
  }
}

function notifPendapatan(
  periode: PeriodePendapatan,
  rentang: PeriodeNotifikasi,
  ringkasan: { total: number; jumlahTransaksi: number },
  sekarang: Date,
): NotifikasiPendapatan {
  return {
    id: `${periode}:${rentang.labelDari}`,
    tipe: 'pendapatan',
    periode,
    dari: rentang.labelDari,
    sampai: rentang.labelSampai,
    total: ringkasan.total,
    jumlahTransaksi: ringkasan.jumlahTransaksi,
    tanggal: sekarang.toISOString(),
  }
}

async function notifikasiStok(sekarang: Date): Promise<Notifikasi[]> {
  const bahanHabis = await prisma.bahan.findMany({
    where: { stok: { lte: 0 } },
    orderBy: { nama: 'asc' },
    select: {
      id: true,
      nama: true,
      satuan: true,
      stok: true,
      stokMinimum: true,
      updatedAt: true,
    },
  })

  return bahanHabis.map((b) => ({
    id: `stok:${b.id}:${tanggalLokal(sekarang)}`,
    tipe: 'stok',
    nama: b.nama,
    stok: b.stok.toNumber(),
    satuan: b.satuan,
    stokMinimum: b.stokMinimum.toNumber(),
    tanggal: b.updatedAt.toISOString(),
  }))
}

async function notifikasiOwner(sekarang: Date): Promise<Notifikasi[]> {
  const periode = periodeNotifikasi(sekarang)
  const [stok, harian, mingguan, bulanan] = await Promise.all([
    notifikasiStok(sekarang),
    ringkasPendapatan(periode.harian),
    periode.tampilkanMingguan
      ? ringkasPendapatan(periode.mingguan)
      : Promise.resolve({ total: 0, jumlahTransaksi: 0 }),
    periode.tampilkanBulanan
      ? ringkasPendapatan(periode.bulanan)
      : Promise.resolve({ total: 0, jumlahTransaksi: 0 }),
  ])

  const notifikasi = [...stok]

  if (harian.jumlahTransaksi > 0) {
    notifikasi.push(notifPendapatan('harian', periode.harian, harian, sekarang))
  }
  if (periode.tampilkanMingguan && mingguan.jumlahTransaksi > 0) {
    notifikasi.push(
      notifPendapatan('mingguan', periode.mingguan, mingguan, sekarang),
    )
  }
  if (periode.tampilkanBulanan && bulanan.jumlahTransaksi > 0) {
    notifikasi.push(
      notifPendapatan('bulanan', periode.bulanan, bulanan, sekarang),
    )
  }

  return notifikasi
}

async function notifikasiKasir(sekarang: Date): Promise<Notifikasi[]> {
  const [stok, pesanan] = await Promise.all([
    notifikasiStok(sekarang),
    prisma.transaksi.findMany({
      where: { sumber: 'ONLINE', statusPesanan: 'MENUNGGU' },
      orderBy: { tanggal: 'desc' },
      take: 20,
      select: {
        id: true,
        nomor: true,
        total: true,
        catatan: true,
        tanggal: true,
        meja: { select: { nomor: true, nama: true } },
        member: { select: { nama: true } },
        _count: { select: { items: true } },
      },
    }),
  ])

  const notifikasiPesanan: NotifikasiPesanan[] = pesanan.map((p) => ({
    id: `pesanan-kasir:${p.id}:MENUNGGU`,
    tipe: 'pesanan',
    untuk: 'kasir',
    nomor: p.nomor,
    total: p.total.toNumber(),
    status: 'MENUNGGU',
    jumlahItem: p._count.items,
    meja: p.meja?.nomor ?? p.meja?.nama ?? null,
    pelanggan: p.member?.nama ?? namaPelangganDariCatatan(p.catatan) ?? null,
    tanggal: p.tanggal.toISOString(),
  }))

  return [...notifikasiPesanan, ...stok]
}

async function notifikasiMember(email: string): Promise<Notifikasi[]> {
  const member = await prisma.member.findFirst({
    where: { email: { equals: email.trim(), mode: 'insensitive' } },
    select: { id: true },
  })
  if (!member) return []

  const [transaksi, pesanan] = await Promise.all([
    prisma.transaksi.findMany({
      where: {
        memberId: member.id,
        ...FILTER_TRANSAKSI_TERJUAL,
      },
      orderBy: { tanggal: 'desc' },
      take: 5,
      select: {
        id: true,
        nomor: true,
        total: true,
        poinDapat: true,
        tanggal: true,
      },
    }),
    prisma.transaksi.findMany({
      where: { memberId: member.id, sumber: 'ONLINE' },
      orderBy: { tanggal: 'desc' },
      take: 5,
      select: {
        id: true,
        nomor: true,
        total: true,
        statusPesanan: true,
        tanggal: true,
        _count: { select: { items: true } },
      },
    }),
  ])

  const notifikasiTransaksi: Notifikasi[] = transaksi.map((t) => ({
    id: `transaksi:${t.id}`,
    tipe: 'transaksi',
    nomor: t.nomor,
    total: t.total.toNumber(),
    poinDapat: t.poinDapat,
    tanggal: t.tanggal.toISOString(),
  }))

  const notifikasiPesanan: NotifikasiPesanan[] = pesanan.map((p) => ({
    id: `pesanan-member:${p.id}:${p.statusPesanan}`,
    tipe: 'pesanan',
    untuk: 'member',
    nomor: p.nomor,
    total: p.total.toNumber(),
    status: p.statusPesanan,
    jumlahItem: p._count.items,
    meja: null,
    pelanggan: null,
    tanggal: p.tanggal.toISOString(),
  }))

  return [...notifikasiTransaksi, ...notifikasiPesanan].sort((a, b) =>
    b.tanggal.localeCompare(a.tanggal),
  )
}

// Kategori notifikasi antar pengguna; nilai di luar daftar ini di Fallback ke
// INFO supaya UI tidak pernah menampilkan kategori asing.
function kategoriNotifikasi(nilai: string): NotifikasiPengajuan['kategori'] {
  if (
    nilai === 'PENGAJUAN' ||
    nilai === 'SETUJUI' ||
    nilai === 'TOLAK' ||
    nilai === 'INFO'
  )
    return nilai
  return 'INFO'
}

// Notifikasi antar pengguna yang disimpan di DB (pengajuan pengeluaran kasir
// ↔ owner). Ditampilkan paling atas karena paling baru dan paling perlu acted.
async function notifikasiPesanDb(
  userId?: string,
): Promise<NotifikasiPengajuan[]> {
  if (!userId) return []
  const baris = await notifikasiTersimpan(userId)
  return baris.map((b) => ({
    id: b.id,
    tipe: 'pengajuan',
    kategori: kategoriNotifikasi(b.tipe),
    judul: b.judul,
    pesan: b.pesan,
    entitasId: b.entitasId,
    tanggal: b.createdAt.toISOString(),
  }))
}

export async function notifikasiData(
  opsi: OpsiNotifikasi,
  sekarang = new Date(),
): Promise<Notifikasi[]> {
  if (opsi.role === 'MEMBER') return notifikasiMember(opsi.email)

  const tersimpan = await notifikasiPesanDb(opsi.userId)
  const hitung =
    opsi.role === 'KASIR'
      ? await notifikasiKasir(sekarang)
      : await notifikasiOwner(sekarang)

  return [...tersimpan, ...hitung]
}

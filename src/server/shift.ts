import { prisma } from '#/db'
import type {
  BukaShiftInput,
  ShiftDataInput,
  TutupShiftInput,
} from '#/validations/shift'
import {
  BukaShiftSchema,
  ShiftDataSchema,
  TutupShiftSchema,
} from '#/validations/shift'
import { GalatDomain } from './galat.js'
import { punyaAkses } from './peran.js'
import { FILTER_TRANSAKSI_TERJUAL } from './transaksiTerjual.js'
import type { Pengguna } from '#/types/auth'

// ─── Shift kas ───
// Satu sesi kerja kasir: buka (kas awal) → transaksi → tutup (kas akhir).
// Rekap kas: seharusnya = kas awal + seluruh pembayaran TUNAI shift ini.

interface RingkasanIsi {
  jumlahTransaksi: number
  totalPenjualan: number
  totalTunai: number
}

const KOSONG: RingkasanIsi = {
  jumlahTransaksi: 0,
  totalPenjualan: 0,
  totalTunai: 0,
}

const kasSeharusnya = (kasAwal: number, totalTunai: number) =>
  kasAwal + totalTunai

// Agregat banyak shift sekaligus (hindari N+1 di halaman riwayat).
async function ringkasanPerShift(ids: string[]) {
  const peta = new Map<string, RingkasanIsi>()
  for (const id of ids) peta.set(id, { ...KOSONG })
  if (ids.length === 0) return peta

  const [trx, bayar] = await Promise.all([
    prisma.transaksi.groupBy({
      by: ['shiftId'],
      where: { shiftId: { in: ids }, ...FILTER_TRANSAKSI_TERJUAL },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.pembayaran.findMany({
      where: {
        metode: 'TUNAI',
        transaksi: {
          shiftId: { in: ids },
          ...FILTER_TRANSAKSI_TERJUAL,
        },
      },
      select: { jumlah: true, transaksi: { select: { shiftId: true } } },
    }),
  ])
  for (const t of trx) {
    const r = t.shiftId ? peta.get(t.shiftId) : undefined
    if (!r) continue
    r.jumlahTransaksi = t._count.id
    r.totalPenjualan = t._sum.total?.toNumber() ?? 0
  }
  for (const b of bayar) {
    const r = b.transaksi.shiftId ? peta.get(b.transaksi.shiftId) : undefined
    if (r) r.totalTunai += b.jumlah.toNumber()
  }
  return peta
}

export async function bukaShift(kasirId: string, input: BukaShiftInput) {
  const data = BukaShiftSchema.parse(input)
  const cekTerbuka = () =>
    prisma.shift.findFirst({
      where: { kasirId, waktuTutup: null },
      select: { id: true },
    })
  if (await cekTerbuka())
    throw new GalatDomain('Masih ada shift yang belum ditutup')

  try {
    const shift = await prisma.shift.create({
      data: { kasirId, kasAwal: data.kasAwal },
      select: { id: true, waktuBuka: true },
    })
    return { id: shift.id, waktuBuka: shift.waktuBuka.toISOString() }
  } catch (e) {
    // Dua perangkat membuka bersamaan: unique parsial (kasirId, waktuTutup IS NULL)
    // membuat salah satu gagal — terjemahkan jadi pesan domain.
    if (await cekTerbuka())
      throw new GalatDomain('Masih ada shift yang belum ditutup')
    throw e
  }
}

export async function tutupShift(kasirId: string, input: TutupShiftInput) {
  const data = TutupShiftSchema.parse(input)
  const shift = await prisma.shift.findFirst({
    where: { kasirId, waktuTutup: null },
    select: { id: true, kasAwal: true },
  })
  if (!shift) throw new GalatDomain('Tidak ada shift yang terbuka')

  const isi = (await ringkasanPerShift([shift.id])).get(shift.id) ?? KOSONG
  const kasAwal = shift.kasAwal.toNumber()
  const seharusnya = kasSeharusnya(kasAwal, isi.totalTunai)
  const selisih = data.kasAkhir - seharusnya

  // Tutup bersyarat: hanya shift yang masih terbuka yang boleh ditutup.
  const ubah = await prisma.shift.updateMany({
    where: { id: shift.id, waktuTutup: null },
    data: {
      waktuTutup: new Date(),
      kasAkhir: data.kasAkhir,
      selisih,
      catatan: data.catatan ?? null,
    },
  })
  if (ubah.count !== 1) throw new GalatDomain('Shift sudah ditutup')

  return {
    id: shift.id,
    kasAwal,
    kasAkhir: data.kasAkhir,
    seharusnya,
    selisih,
    ...isi,
  }
}

export async function dataShift(user: Pengguna, input: ShiftDataInput) {
  const data = ShiftDataSchema.parse(input)
  const akhir = data.sampai
    ? new Date(`${data.sampai}T23:59:59.999`)
    : new Date()
  const awal = data.dari
    ? new Date(`${data.dari}T00:00:00`)
    : new Date(akhir.getFullYear(), akhir.getMonth(), 1)
  if (akhir < awal) throw new GalatDomain('Rentang tanggal tidak valid')

  const semuaKasir = punyaAkses(user.role, 'manajerial')
  const pilih = {
    id: true,
    kasirId: true,
    kasir: { select: { name: true } },
    waktuBuka: true,
    waktuTutup: true,
    kasAwal: true,
    kasAkhir: true,
    selisih: true,
    catatan: true,
  } as const

  const [aktif, riwayat] = await Promise.all([
    prisma.shift.findFirst({
      where: { kasirId: user.id, waktuTutup: null },
      select: pilih,
    }),
    prisma.shift.findMany({
      where: {
        waktuBuka: { gte: awal, lte: akhir },
        ...(semuaKasir ? {} : { kasirId: user.id }),
      },
      orderBy: { waktuBuka: 'desc' },
      take: 100,
      select: pilih,
    }),
  ])

  const ids = [aktif?.id, ...riwayat.map((r) => r.id)].filter(
    (v): v is string => Boolean(v),
  )
  const peta = await ringkasanPerShift(ids)
  const bentuk = (s: {
    id: string
    kasirId: string
    kasir: { name: string }
    waktuBuka: Date
    waktuTutup: Date | null
    kasAwal: { toNumber: () => number }
    kasAkhir: { toNumber: () => number } | null
    selisih: { toNumber: () => number } | null
    catatan: string | null
  }) => {
    const r = peta.get(s.id) ?? KOSONG
    const kasAwal = s.kasAwal.toNumber()
    return {
      id: s.id,
      kasirId: s.kasirId,
      kasirNama: s.kasir.name,
      waktuBuka: s.waktuBuka.toISOString(),
      waktuTutup: s.waktuTutup?.toISOString() ?? null,
      kasAwal,
      kasAkhir: s.kasAkhir?.toNumber() ?? null,
      selisih: s.selisih?.toNumber() ?? null,
      catatan: s.catatan,
      jumlahTransaksi: r.jumlahTransaksi,
      totalPenjualan: r.totalPenjualan,
      totalTunai: r.totalTunai,
      seharusnya: kasSeharusnya(kasAwal, r.totalTunai),
    }
  }

  return {
    semuaKasir,
    shiftAktif: aktif ? bentuk(aktif) : null,
    riwayat: riwayat.map(bentuk),
  }
}

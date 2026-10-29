import { prismaBaca } from '#/db-read'
import { Prisma } from '#/generated/prisma/client.js'
import { GalatDomain } from './galat.js'
import { LaporanPajakSchema } from '#/validations/laporan-pajak'
import type { LaporanPajakInput } from '#/validations/laporan-pajak'
import type { LaporanPajakOutput } from '#/types/laporan'

export type { LaporanPajakOutput } from '#/types/laporan'

// Zona waktu untuk pengelompokan periode laporan. Server laporan berjalan
// dengan waktu Indonesia Barat; kolom tanggal tersimpan sebagai UTC.
const ZONA_LAPORAN = 'Asia/Jakarta'

// Ekspresi SQL: ubah instant UTC ke waktu lokal laporan.
const tglLokal = Prisma.sql`("tanggal" AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_LAPORAN}`

// ─── Laporan rekap pajak periode (PB1/PPN) ───
// Mengelompokkan transaksi per jenis pajak (PB1 restoran/cafe, PPN retail)
// dan periode. Data sudah tersimpan per transaksi di Transaksi.pajakJenis +
// Transaksi.pajak; fungsi ini hanya agregasi — tidak mengubah apa pun.

interface Agregat {
  trx: number
  pajak: number
  total: number
  subtotal: number
}

export async function laporanPajak(
  input: LaporanPajakInput,
): Promise<LaporanPajakOutput> {
  const data = LaporanPajakSchema.parse(input)
  const awal = new Date(`${data.dari}T00:00:00`)
  const akhir = new Date(`${data.sampai}T23:59:59.999`)
  if (akhir < awal) throw new GalatDomain('Rentang tanggal tidak valid')

  // Format periode mengikuti kunci kunciPeriode (ISO-8601 untuk mingguan).
  const periode =
    data.grup === 'bulanan'
      ? Prisma.sql`to_char(${tglLokal}, 'YYYY-MM')`
      : data.grup === 'mingguan'
        ? Prisma.sql`to_char(${tglLokal}, 'IYYY-"W"IW')`
        : Prisma.sql`to_char(${tglLokal}, 'YYYY-MM-DD')`

  // Agregasi penuh di SQL: satu baris per (periode, jenis pajak).
  const barisAgg = await prismaBaca.$queryRaw<
    Array<{
      periode: string
      jenis: string
      trx: bigint
      pajak: Prisma.Decimal
      total: Prisma.Decimal
      subtotal: Prisma.Decimal
    }>
  >(Prisma.sql`
    SELECT ${periode} AS "periode",
           COALESCE("pajakJenis", 'Tanpa pajak') AS "jenis",
           COUNT(*) AS "trx",
           SUM(COALESCE("pajak", 0)) AS "pajak",
           SUM("total") AS "total",
           SUM("subtotal") AS "subtotal"
    FROM "Transaksi"
    WHERE "tanggal" BETWEEN ${awal} AND ${akhir}
      AND "dibayarPada" IS NOT NULL
      AND "statusPesanan" <> 'DIBATALKAN'
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `)

  // Ringkasan keseluruhan per jenis pajak.
  const totalPerJenis = new Map<string, Agregat>()
  for (const b of barisAgg) {
    let a = totalPerJenis.get(b.jenis)
    if (!a) {
      a = { trx: 0, pajak: 0, total: 0, subtotal: 0 }
      totalPerJenis.set(b.jenis, a)
    }
    a.trx += Number(b.trx)
    a.pajak += b.pajak.toNumber()
    a.total += b.total.toNumber()
    a.subtotal += b.subtotal.toNumber()
  }

  const perJenisPeriode = new Map<string, Map<string, Agregat>>()
  for (const b of barisAgg) {
    let perJenis = perJenisPeriode.get(b.periode)
    if (!perJenis) {
      perJenis = new Map()
      perJenisPeriode.set(b.periode, perJenis)
    }
    perJenis.set(b.jenis, {
      trx: Number(b.trx),
      pajak: b.pajak.toNumber(),
      total: b.total.toNumber(),
      subtotal: b.subtotal.toNumber(),
    })
  }

  // BarisAgg sudah diurutkan per periode; pertahankan urutan SQL.
  const riwayat = [...perJenisPeriode.entries()].map(([kunci, perJenis]) => ({
    periode: kunci,
    jenis: [...perJenis.entries()].map(([jenis, cur]) => ({
      jenis,
      pajak: cur.pajak,
    })),
  }))

  return {
    dari: data.dari,
    sampai: data.sampai,
    grup: data.grup,
    totalPerJenis: [...totalPerJenis.entries()].map(([jenis, cur]) => ({
      jenis,
      jumlahTransaksi: cur.trx,
      pajak: cur.pajak,
      total: cur.total,
      subtotal: cur.subtotal,
    })),
    riwayat,
  }
}

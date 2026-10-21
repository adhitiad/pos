import { prisma } from '#/db'
import { GalatDomain } from './galat.js'
import { LaporanPajakSchema } from '#/validations/laporan-pajak'
import type { Grup, LaporanPajakInput } from '#/validations/laporan-pajak'

export interface LaporanPajakOutput {
  dari: string
  sampai: string
  grup: Grup
  totalPerJenis: {
    jenis: string
    jumlahTransaksi: number
    pajak: number
    total: number
    subtotal: number
  }[]
  riwayat: {
    periode: string
    jenis: {
      jenis: string
      pajak: number
    }[]
  }[]
}

// ─── Laporan rekap pajak periode (PB1/PPN) ───
// Mengelompokkan transaksi per jenis pajak (PB1 restoran/cafe, PPN retail)
// dan periode. Data sudah tersimpan per transaksi di Transaksi.pajakJenis +
// Transaksi.pajak; fungsi ini hanya agregasi — tidak mengubah apa pun.

interface BarisPajak {
  tanggal: Date
  jenis: string
  pajak: number
  total: number
  subtotal: number
}

interface Agregat {
  trx: number
  pajak: number
  total: number
  subtotal: number
}

function kunciPeriode(
  tgl: Date,
  grup: 'harian' | 'mingguan' | 'bulanan',
): string {
  const y = tgl.getFullYear()
  const m = String(tgl.getMonth() + 1).padStart(2, '0')
  const d = String(tgl.getDate()).padStart(2, '0')
  if (grup === 'bulanan') return `${y}-${m}`
  if (grup === 'mingguan') {
    const d2 = new Date(Date.UTC(y, tgl.getMonth(), tgl.getDate()))
    const hari = d2.getUTCDay() || 7
    d2.setUTCDate(d2.getUTCDate() + 4 - hari)
    const awalTahun = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))
    const minggu = Math.ceil(
      ((d2.getTime() - awalTahun.getTime()) / 86_400_000 + 1) / 7,
    )
    return `${d2.getUTCFullYear()}-W${String(minggu).padStart(2, '0')}`
  }
  return `${y}-${m}-${d}`
}

export async function laporanPajak(
  input: LaporanPajakInput,
): Promise<LaporanPajakOutput> {
  const data = LaporanPajakSchema.parse(input)
  const awal = new Date(`${data.dari}T00:00:00`)
  const akhir = new Date(`${data.sampai}T23:59:59.999`)
  if (akhir < awal) throw new GalatDomain('Rentang tanggal tidak valid')

  const transaksi = await prisma.transaksi.findMany({
    where: { tanggal: { gte: awal, lte: akhir } },
    orderBy: { tanggal: 'asc' },
    select: {
      tanggal: true,
      pajakJenis: true,
      pajak: true,
      total: true,
      subtotal: true,
    },
  })

  const baris: BarisPajak[] = transaksi.map((t) => ({
    tanggal: t.tanggal,
    jenis: t.pajakJenis ?? 'Tanpa pajak',
    pajak: t.pajak.toNumber(),
    total: t.total.toNumber(),
    subtotal: t.subtotal.toNumber(),
  }))

  // Agregat per periode + jenis pajak.
  const peta = new Map<string, Map<string, Agregat>>()
  for (const b of baris) {
    const periode = kunciPeriode(b.tanggal, data.grup)
    let perJenis = peta.get(periode)
    if (!perJenis) {
      perJenis = new Map()
      peta.set(periode, perJenis)
    }
    let cur = perJenis.get(b.jenis)
    if (!cur) {
      cur = { trx: 0, pajak: 0, total: 0, subtotal: 0 }
      perJenis.set(b.jenis, cur)
    }
    cur.trx += 1
    cur.pajak += b.pajak
    cur.total += b.total
    cur.subtotal += b.subtotal
  }

  // Ringkasan keseluruhan per jenis pajak.
  const totalPerJenis = new Map<string, Agregat>()
  for (const perJenis of peta.values()) {
    for (const [jenis, cur] of perJenis) {
      let a = totalPerJenis.get(jenis)
      if (!a) {
        a = { trx: 0, pajak: 0, total: 0, subtotal: 0 }
        totalPerJenis.set(jenis, a)
      }
      a.trx += cur.trx
      a.pajak += cur.pajak
      a.total += cur.total
      a.subtotal += cur.subtotal
    }
  }

  const riwayat = [...peta.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([periode, perJenis]) => ({
      periode,
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

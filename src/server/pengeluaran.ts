import { prisma } from '#/db'
import type { PengeluaranInput } from '#/validations/pengeluaran'
import type { Tx } from '#/types/prisma'
import { GalatDomain } from './galat.js'
import { kodeHarian, nomorBerikut } from './penomoran.js'
import { JENIS_PENGELUARAN, KODE_AKUN_KAS } from './pengeluaranJenis.js'

type MetaJenis = { kodeAkun: string; label: string }

// Kontrak jurnal yang dikembalikan pemanggil (Decimal → number agar bisa
// diserialisasi server function tanpa kehilangan presisi rupiah).
export type JurnalPengeluaran = {
  id: string
  nomor: string
  tanggal: string
  keterangan: string | null
  entri: {
    id: string
    akunId: string
    akunKode: string
    akunNama: string
    debit: number
    kredit: number
    keterangan: string | null
  }[]
}

const metaJenis = (jenis: string): MetaJenis | undefined =>
  (JENIS_PENGELUARAN as Record<string, MetaJenis | undefined>)[jenis]

// Buat jurnal pengeluaran berimbang: debit akun biaya/modal/hutang, kredit Kas.
// Dipanggil di dalam transaksi pemanggil supaya pengajuan yang disetujui owner
// menghasilkan jurnal + update status + notifikasi dalam satu commit.
export async function buatJurnalPengeluaran(
  tx: Tx,
  input: {
    nominal: number
    jenis: string
    keterangan?: string
    tanggal: Date
  },
) {
  if (!input.nominal || input.nominal <= 0)
    throw new GalatDomain('Nominal harus lebih besar dari nol')

  const meta = metaJenis(input.jenis)
  if (!meta) throw new GalatDomain('Jenis akun pengeluaran tidak valid')

  const [akunDebit, akunKas] = await Promise.all([
    tx.akun.findUnique({ where: { kode: meta.kodeAkun } }),
    tx.akun.findUnique({ where: { kode: KODE_AKUN_KAS } }),
  ])
  if (!akunDebit) throw new GalatDomain(`Akun ${meta.kodeAkun} tidak ditemukan`)
  if (!akunKas)
    throw new GalatDomain(`Akun Kas (${KODE_AKUN_KAS}) tidak ditemukan`)

  return await tx.jurnal.create({
    data: {
      nomor: await nomorBerikut(tx, 'jurnal', kodeHarian('JU')),
      tanggal: input.tanggal,
      keterangan: `${meta.label}${input.keterangan ? ` — ${input.keterangan}` : ''}`,
      entri: {
        create: [
          { akunId: akunDebit.id, debit: input.nominal, kredit: 0 },
          { akunId: akunKas.id, debit: 0, kredit: input.nominal },
        ],
      },
    },
    include: { entri: { include: { akun: true } } },
  })
}

// Ubah jurnal Prisma (Decimal) menjadi bentuk yang aman dikirim ke klien.
export function serialkanJurnal(jurnal: {
  id: string
  nomor: string
  tanggal: Date
  keterangan: string | null
  entri: {
    id: string
    akunId: string
    debit: { toNumber: () => number }
    kredit: { toNumber: () => number }
    keterangan: string | null
    akun: { kode: string; nama: string }
  }[]
}): JurnalPengeluaran {
  return {
    id: jurnal.id,
    nomor: jurnal.nomor,
    tanggal: jurnal.tanggal.toISOString(),
    keterangan: jurnal.keterangan,
    entri: jurnal.entri.map((e) => ({
      id: e.id,
      akunId: e.akunId,
      akunKode: e.akun.kode,
      akunNama: e.akun.nama,
      debit: e.debit.toNumber(),
      kredit: e.kredit.toNumber(),
      keterangan: e.keterangan,
    })),
  }
}

// Catat pengeluaran owner di buku besar: satu jurnal berimbang
// (debit akun biaya/modal/hutang, kredit Kas) dalam satu transaksi.
// Fungsi murni: tanpa createServerFn, dapat di-unit-test langsung.
export async function catatPengeluaran(input: PengeluaranInput) {
  const tanggal = new Date(`${input.tanggal}T00:00:00`)

  return await prisma.$transaction(async (tx) => {
    const jurnal = await buatJurnalPengeluaran(tx, {
      nominal: input.nominal,
      jenis: input.jenis,
      keterangan: input.keterangan,
      tanggal,
    })
    return { jurnal: serialkanJurnal(jurnal) }
  })
}

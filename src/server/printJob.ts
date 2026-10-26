import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client.js'
import { normalisasiStrukPayload } from '#/lib/struk'
import { GalatDomain } from './galat.js'
import {
  BuatPrintJobSchema,
  DaftarPrintJobSchema,
} from '#/validations/percetakan'
import type {
  BuatPrintJobInput,
  DaftarPrintJobInput,
} from '#/validations/percetakan'
import type { PrintJobRow, StrukPayload } from '#/types/percetakan'
import { printerDefault } from './printerUmum.js'

// ─── Antrean cetak ───

// Susun isi struk dari transaksi (snapshot server, bukan data klien).
export async function muatPayloadStruk(
  transaksiId: string,
): Promise<StrukPayload | null> {
  const transaksi = await prisma.transaksi.findUnique({
    where: { id: transaksiId },
    select: {
      nomor: true,
      tanggal: true,
      subtotal: true,
      diskon: true,
      pajak: true,
      pajakJenis: true,
      ongkir: true,
      total: true,
      metodeBayar: true,
      uangDiterima: true,
      kembalian: true,
      catatan: true,
      member: { select: { nama: true } },
      items: {
        select: {
          namaProduk: true,
          qty: true,
          harga: true,
          subtotal: true,
          modifiers: {
            select: {
              qty: true,
              hargaTambahan: true,
              catatan: true,
              modifier: { select: { nama: true } },
            },
          },
        },
      },
      pembayaran: { select: { metode: true, jumlah: true } },
    },
  })
  if (!transaksi) return null
  return {
    nomor: transaksi.nomor,
    tanggal: transaksi.tanggal.toISOString(),
    items: transaksi.items.map((i) => ({
      nama: i.namaProduk,
      qty: i.qty,
      harga: i.harga.toNumber(),
      subtotal: i.subtotal.toNumber(),
      modifier: i.modifiers.map((m) => ({
        nama: m.modifier.nama,
        qty: m.qty,
        tambahan: m.hargaTambahan.toNumber(),
        catatan: m.catatan,
      })),
    })),
    subtotal: transaksi.subtotal.toNumber(),
    diskon: transaksi.diskon.toNumber(),
    pajak: transaksi.pajak.toNumber(),
    pajakJenis: transaksi.pajakJenis,
    ongkir: transaksi.ongkir.toNumber(),
    total: transaksi.total.toNumber(),
    metodeBayar: transaksi.metodeBayar,
    pembayaran: transaksi.pembayaran.map((p) => ({
      metode: p.metode,
      jumlah: p.jumlah.toNumber(),
    })),
    uangDiterima: transaksi.uangDiterima?.toNumber() ?? null,
    kembalian: transaksi.kembalian?.toNumber() ?? null,
    memberNama: transaksi.member?.nama ?? null,
    catatan: transaksi.catatan,
  }
}

// Buat job cetak. Idempoten lewat `idempotencyKey`: retry (mis. antrean
// offline dikirim ulang) mengembalikan job yang sama, bukan job ganda.
export async function buatPrintJob(
  input: BuatPrintJobInput,
  userId?: string,
  peran: 'OWNER' | 'KASIR' = 'OWNER',
): Promise<PrintJobRow> {
  const data = BuatPrintJobSchema.parse(input)

  if (data.idempotencyKey) {
    const ada = await prisma.printJob.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    })
    if (ada) return await muatJob(ada.id)
  }

  const payload = await muatPayloadStruk(data.transaksiId)
  if (!payload) throw new GalatDomain('Transaksi tidak ditemukan')

  const printerId = data.printerId ?? (await printerDefault(userId))?.id ?? null
  if (printerId) {
    const printer = await prisma.printer.findUnique({
      where: { id: printerId },
      select: { aktif: true },
    })
    if (!printer) throw new GalatDomain('Printer tidak ditemukan')
    if (!printer.aktif) throw new GalatDomain('Printer sedang nonaktif')
  }

  const job = await prisma.$transaction(async (tx) => {
    if (data.tipe === 'STRUK') {
      const cetak = await tx.transaksi.updateMany({
        where: {
          id: data.transaksiId,
          ...(peran === 'KASIR' && { cetakKasir: { lt: 3 } }),
        },
        data:
          peran === 'OWNER'
            ? { cetakOwner: { increment: 1 } }
            : { cetakKasir: { increment: 1 } },
      })
      if (cetak.count !== 1) {
        if (peran === 'KASIR') {
          throw new GalatDomain(
            'Kasir hanya dapat mencetak ulang struk maksimal 3 kali.',
          )
        }
        throw new GalatDomain('Transaksi tidak ditemukan')
      }
    }

    const dibuat = await tx.printJob.create({
      data: {
        printerId,
        transaksiId: data.transaksiId,
        tipe: data.tipe,
        idempotencyKey: data.idempotencyKey ?? null,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    })
    if (printerId) {
      await tx.printer.updateMany({
        where: { id: printerId },
        data: { terakhirDipakai: new Date() },
      })
    }
    return dibuat
  })
  return await muatJob(job.id)
}

// Ambil satu job lengkap (dengan payload).
export async function muatJob(id: string): Promise<PrintJobRow> {
  const job = await prisma.printJob.findUnique({
    where: { id },
    include: {
      printer: { select: { nama: true } },
      transaksi: { select: { cetakOwner: true, cetakKasir: true } },
    },
  })
  if (!job) throw new GalatDomain('Job cetak tidak ditemukan')
  return {
    id: job.id,
    printerId: job.printerId,
    printerNama: job.printer?.nama ?? null,
    transaksiId: job.transaksiId,
    tipe: job.tipe,
    status: job.status,
    percobaan: job.percobaan,
    pesanGalat: job.pesanGalat,
    dicetakPada: job.dicetakPada?.toISOString() ?? null,
    diambilPada: job.diambilPada?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    cetakOwner: job.transaksi?.cetakOwner ?? 0,
    cetakKasir: job.transaksi?.cetakKasir ?? 0,
    payload: normalisasiStrukPayload(job.payload),
  }
}

// Daftar job (polling client pencetak).
export async function daftarPrintJob(
  input: DaftarPrintJobInput,
): Promise<PrintJobRow[]> {
  const data = DaftarPrintJobSchema.parse(input)
  const rows = await prisma.printJob.findMany({
    where: {
      ...(data.status && { status: data.status }),
      ...(data.printerId && { printerId: data.printerId }),
    },
    orderBy: { createdAt: 'asc' },
    take: data.take ?? 20,
    include: {
      printer: { select: { nama: true } },
      transaksi: { select: { cetakOwner: true, cetakKasir: true } },
    },
  })
  return rows.map((job) => ({
    id: job.id,
    printerId: job.printerId,
    printerNama: job.printer?.nama ?? null,
    transaksiId: job.transaksiId,
    tipe: job.tipe,
    status: job.status,
    percobaan: job.percobaan,
    pesanGalat: job.pesanGalat,
    dicetakPada: job.dicetakPada?.toISOString() ?? null,
    diambilPada: job.diambilPada?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    cetakOwner: job.transaksi?.cetakOwner ?? 0,
    cetakKasir: job.transaksi?.cetakKasir ?? 0,
    payload: normalisasiStrukPayload(job.payload),
  }))
}

// Klaim job: hanya satu client pencetak yang bisa mengambil job yang sama
// (update bersyarat status MENUNGGU → DIPROSES).
export async function ambilPrintJob(id: string): Promise<PrintJobRow> {
  const terambil = await prisma.printJob.updateMany({
    where: { id, status: 'MENUNGGU' },
    data: {
      status: 'DIPROSES',
      diambilPada: new Date(),
      percobaan: { increment: 1 },
    },
  })
  if (terambil.count !== 1) {
    throw new GalatDomain('Job sudah diambil atau tidak ada')
  }
  return await muatJob(id)
}

// Klien selesai mencetak.
export async function selesaiPrintJob(id: string): Promise<PrintJobRow> {
  const ada = await prisma.printJob.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!ada) throw new GalatDomain('Job cetak tidak ditemukan')
  if (ada.status === 'DICETAK') return await muatJob(id)
  await prisma.printJob.update({
    where: { id },
    data: { status: 'DICETAK', dicetakPada: new Date(), pesanGalat: null },
  })
  return await muatJob(id)
}

// Klien gagal mencetak (paper habis, printer mati, dll).
export async function gagalPrintJob(
  id: string,
  pesan?: string,
): Promise<PrintJobRow> {
  const ada = await prisma.printJob.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!ada) throw new GalatDomain('Job cetak tidak ditemukan')
  await prisma.printJob.update({
    where: { id },
    data: { status: 'GAGAL', pesanGalat: pesan ?? null },
  })
  return await muatJob(id)
}

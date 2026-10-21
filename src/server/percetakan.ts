import { prisma } from '#/db'
import type { Printer, Prisma } from '#/generated/prisma/client.js'
import { GalatDomain } from './galat.js'
import {
  BuatPrintJobSchema,
  DaftarPrintJobSchema,
  PrinterDeviceInputSchema,
  PrinterIdSchema,
  PrinterInputSchema,
  UpdatePrinterSchema,
} from '#/validations/percetakan'
import type {
  BuatPrintJobInput,
  DaftarPrintJobInput,
  PrinterDeviceInput,
  PrinterInput,
  UpdatePrinterInput,
} from '#/validations/percetakan'
import type { PrintJobRow, PrinterRow, StrukPayload } from '#/types/percetakan'

function keBarisPrinter(p: Printer): PrinterRow {
  return {
    id: p.id,
    userId: p.userId,
    nama: p.nama,
    tipe: p.tipe,
    lokasi: p.lokasi,
    perangkat: p.perangkat,
    koneksi: p.koneksi,
    vendorId: p.vendorId,
    vendorName: p.vendorName,
    serialNumber: p.serialNumber,
    productName: p.productName,
    dipindaiPada: p.dipindaiPada?.toISOString() ?? null,
    default: p.default,
    aktif: p.aktif,
  }
}

// ─── Master printer ───

export async function daftarPrinter(): Promise<PrinterRow[]> {
  const rows = await prisma.printer.findMany({ orderBy: { nama: 'asc' } })
  return rows.map(keBarisPrinter)
}

// Perangkat hasil pindai milik pengguna (OWNER/KASIR). Dipakai klien mobile
// untuk menampilkan printer yang sudah dikenal beserta jalur koneksinya.
export async function daftarPrinterPerangkat(
  userId: string,
): Promise<PrinterRow[]> {
  const rows = await prisma.printer.findMany({
    where: { userId, aktif: true },
    orderBy: [{ dipindaiPada: 'desc' }, { nama: 'asc' }],
  })
  return rows.map(keBarisPrinter)
}

// Daftarkan/segarkan perangkat hasil pindai. `userId` selalu berasal dari sesi
// OWNER/KASIR, bukan body request. Upsert memakai (userId, perangkat) agar
// pemindaian berulang tidak membuat baris ganda.
export async function daftarkanPrinterPerangkat(
  input: PrinterDeviceInput,
  userId: string,
): Promise<PrinterRow> {
  const data = PrinterDeviceInputSchema.parse(input)
  const sekarang = new Date()
  const row = await prisma.printer.upsert({
    where: {
      userId_perangkat: { userId, perangkat: data.perangkat },
    },
    update: {
      nama: data.nama,
      tipe: data.tipe,
      lokasi: data.lokasi ?? null,
      koneksi: data.koneksi,
      vendorId: data.vendorId ?? undefined,
      vendorName: data.vendorName ?? undefined,
      serialNumber: data.serialNumber ?? undefined,
      productName: data.productName ?? undefined,
      dipindaiPada: sekarang,
      aktif: true,
    },
    create: {
      userId,
      nama: data.nama,
      tipe: data.tipe,
      lokasi: data.lokasi ?? null,
      perangkat: data.perangkat,
      koneksi: data.koneksi,
      vendorId: data.vendorId ?? null,
      vendorName: data.vendorName ?? null,
      serialNumber: data.serialNumber ?? null,
      productName: data.productName ?? null,
      dipindaiPada: sekarang,
      default: false,
      aktif: true,
    },
  })
  return keBarisPrinter(row)
}

// Printer default yang aktif — dipakai saat klien tak menyebut printer.
export async function printerDefault(): Promise<PrinterRow | null> {
  const row =
    (await prisma.printer.findFirst({
      where: { default: true, aktif: true },
      orderBy: { nama: 'asc' },
    })) ?? (await prisma.printer.findFirst({ where: { aktif: true } }))
  if (!row) return null
  return keBarisPrinter(row)
}

export async function createPrinter(
  input: PrinterInput,
  userId?: string,
): Promise<{ id: string }> {
  const data = PrinterInputSchema.parse(input)
  const dibuat = await prisma.printer.create({
    data: {
      userId: userId ?? null,
      nama: data.nama,
      tipe: data.tipe,
      lokasi: data.lokasi ?? null,
      perangkat: data.perangkat ?? null,
      koneksi: data.koneksi,
      vendorId: data.vendorId ?? null,
      vendorName: data.vendorName ?? null,
      serialNumber: data.serialNumber ?? null,
      productName: data.productName ?? null,
      dipindaiPada: data.perangkat ? new Date() : null,
      default: data.default,
      aktif: data.aktif,
    },
    select: { id: true },
  })
  // Hanya satu printer default yang aktif.
  if (data.default) {
    await prisma.printer.updateMany({
      where: { id: { not: dibuat.id }, default: true },
      data: { default: false },
    })
  }
  return dibuat
}

export async function updatePrinter(
  input: UpdatePrinterInput,
): Promise<{ id: string }> {
  const data = UpdatePrinterSchema.parse(input)
  const lama = await prisma.printer.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Printer tidak ditemukan')
  await prisma.printer.update({
    where: { id: data.id },
    data: {
      nama: data.nama,
      tipe: data.tipe,
      lokasi: data.lokasi ?? null,
      perangkat: data.perangkat ?? null,
      ...(data.koneksi ? { koneksi: data.koneksi } : {}),
      ...(data.vendorId !== undefined
        ? { vendorId: data.vendorId || null }
        : {}),
      ...(data.vendorName !== undefined
        ? { vendorName: data.vendorName || null }
        : {}),
      ...(data.serialNumber !== undefined
        ? { serialNumber: data.serialNumber || null }
        : {}),
      ...(data.productName !== undefined
        ? { productName: data.productName || null }
        : {}),
      default: data.default,
      aktif: data.aktif,
    },
  })
  // Hanya satu printer default yang aktif.
  if (data.default) {
    await prisma.printer.updateMany({
      where: { id: { not: data.id }, default: true },
      data: { default: false },
    })
  }
  return { id: data.id }
}

export async function hapusPrinter(input: {
  id: string
}): Promise<{ id: string }> {
  const data = PrinterIdSchema.parse(input)
  const ada = await prisma.printer.findUnique({
    where: { id: data.id },
    include: { _count: { select: { jobs: true } } },
  })
  if (!ada) throw new GalatDomain('Printer tidak ditemukan')
  if (ada._count.jobs > 0) {
    throw new GalatDomain(
      `Printer punya ${ada._count.jobs} riwayat cetak — nonaktifkan saja`,
    )
  }
  await prisma.printer.delete({ where: { id: data.id } })
  return { id: data.id }
}

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

  const printerId = data.printerId ?? (await printerDefault())?.id ?? null
  if (printerId) {
    const printer = await prisma.printer.findUnique({
      where: { id: printerId },
      select: { aktif: true },
    })
    if (!printer) throw new GalatDomain('Printer tidak ditemukan')
    if (!printer.aktif) throw new GalatDomain('Printer sedang nonaktif')
  }

  const job = await prisma.printJob.create({
    data: {
      printerId,
      transaksiId: data.transaksiId,
      tipe: data.tipe,
      idempotencyKey: data.idempotencyKey ?? null,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  })
  return await muatJob(job.id)
}

// Ambil satu job lengkap (dengan payload).
export async function muatJob(id: string): Promise<PrintJobRow> {
  const job = await prisma.printJob.findUnique({
    where: { id },
    include: { printer: { select: { nama: true } } },
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
    payload: (job.payload as StrukPayload | null) ?? null,
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
    include: { printer: { select: { nama: true } } },
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
    payload: (job.payload as StrukPayload | null) ?? null,
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

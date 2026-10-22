import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import type { Printer } from '#/generated/prisma/client.js'
import { catatAudit, selisihField } from './audit.js'
import { GalatDomain, GalatKonflik } from './galat.js'
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

const BATAS_PERANGKAT = 20
const INTERVAL_SCAN_MS = 5 * 60_000

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
    terakhirDipakai: p.terakhirDipakai?.toISOString() ?? null,
    default: p.default,
    defaultPengguna: p.defaultPengguna,
    aktif: p.aktif,
  }
}

// Snapshot audit tidak memuat serial/vendor: metadata perangkat tidak boleh
// ikut terbaca lewat UI audit. `metadataBerubah` cukup menandai perubahannya.
function snapshotAuditPrinter(p: {
  nama: string
  tipe: string
  lokasi: string | null
  perangkat: string | null
  koneksi: string
  vendorId: string | null
  vendorName: string | null
  serialNumber: string | null
  productName: string | null
  default: boolean
  defaultPengguna: boolean
  aktif: boolean
}) {
  return {
    nama: p.nama,
    tipe: p.tipe,
    lokasi: p.lokasi,
    perangkat: p.perangkat,
    koneksi: p.koneksi,
    default: p.default,
    defaultPengguna: p.defaultPengguna,
    aktif: p.aktif,
    metadataBerubah: Boolean(
      p.vendorId || p.vendorName || p.serialNumber || p.productName,
    ),
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
    take: 50,
  })
  return rows.map(keBarisPrinter)
}

// Daftarkan/segarkan perangkat hasil pindai. `userId` selalu berasal dari sesi
// OWNER/KASIR, bukan body request. Upsert memakai (userId, perangkat) agar
// pemindaian berulang tidak membuat baris ganda.
export async function daftarkanPrinterPerangkat(
  input: PrinterDeviceInput,
  userId: string,
  aktorId?: string,
): Promise<PrinterRow> {
  const data = PrinterDeviceInputSchema.parse(input)
  const sekarang = new Date()
  const simpan = async () => {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`
      const lama = await tx.printer.findUnique({
        where: {
          userId_perangkat: { userId, perangkat: data.perangkat },
        },
      })
      if (!lama) {
        const jumlah = await tx.printer.count({ where: { userId } })
        if (jumlah >= BATAS_PERANGKAT) {
          throw new GalatKonflik(
            'LIMIT_PERANGKAT',
            `Maksimal ${BATAS_PERANGKAT} perangkat per pengguna`,
          )
        }
      }
      const metadataBerubah =
        !lama ||
        lama.nama !== data.nama ||
        lama.tipe !== data.tipe ||
        lama.lokasi !== (data.lokasi ?? null) ||
        lama.koneksi !== data.koneksi ||
        lama.vendorId !== (data.vendorId ?? lama.vendorId) ||
        lama.vendorName !== (data.vendorName ?? lama.vendorName) ||
        lama.serialNumber !== (data.serialNumber ?? lama.serialNumber) ||
        lama.productName !== (data.productName ?? lama.productName)
      const scanJatuhTempo =
        !lama?.dipindaiPada ||
        sekarang.getTime() - lama.dipindaiPada.getTime() >= INTERVAL_SCAN_MS
      const perluPerbarui =
        !lama || !lama.aktif || metadataBerubah || scanJatuhTempo
      if (lama && !perluPerbarui) return { row: lama, lama }
      const row = await tx.printer.upsert({
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
          dipindaiPada: scanJatuhTempo ? sekarang : undefined,
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
      return { row, lama }
    })
  }

  let hasil: Awaited<ReturnType<typeof simpan>>
  try {
    hasil = await simpan()
  } catch (e) {
    const kode =
      e instanceof Prisma.PrismaClientKnownRequestError ? e.code : null
    if (kode !== 'P2002') throw e
    hasil = await simpan()
  }

  const { row, lama } = hasil
  const sebelum = lama ? snapshotAuditPrinter(lama) : null
  const baru = !lama
  const sesudah = snapshotAuditPrinter(row)
  if (baru) {
    await catatAudit({
      aktorId: aktorId ?? userId,
      aksi: 'printer.perangkat.daftar',
      entitas: 'Printer',
      entitasId: row.id,
      sesudah,
    })
  } else if (sebelum) {
    const selisih = selisihField(sebelum, sesudah)
    if (Object.keys(selisih.sesudah).length > 0) {
      await catatAudit({
        aktorId: aktorId ?? userId,
        aksi: 'printer.perangkat.daftar',
        entitas: 'Printer',
        entitasId: row.id,
        sebelum: selisih.sebelum,
        sesudah: selisih.sesudah,
      })
    }
  }

  return keBarisPrinter(row)
}

// Nonaktifkan perangkat milik sesi. Hapus permanen hanya bila belum punya
// riwayat cetak; perangkat orang lain selalu tampak "tidak ditemukan".
export async function hapusPrinterPerangkat(
  input: { id: string; permanen?: boolean },
  userId: string,
  aktorId?: string,
): Promise<{ id: string; dihapus: boolean }> {
  const data = PrinterIdSchema.parse(input)
  const lama = await prisma.printer.findFirst({
    where: { id: data.id, userId },
    include: { _count: { select: { jobs: true } } },
  })
  if (!lama) throw new GalatDomain('Perangkat tidak ditemukan')

  if (input.permanen) {
    if (lama._count.jobs > 0) {
      throw new GalatKonflik(
        'PERANGKAT_BERJOB',
        `Perangkat punya ${lama._count.jobs} riwayat cetak — nonaktifkan saja`,
      )
    }
    await prisma.printer.delete({ where: { id: data.id } })
    await catatAudit({
      aktorId: aktorId ?? userId,
      aksi: 'printer.perangkat.hapus',
      entitas: 'Printer',
      entitasId: data.id,
      sebelum: snapshotAuditPrinter(lama),
    })
    return { id: data.id, dihapus: true }
  }

  const sesudah = {
    ...snapshotAuditPrinter(lama),
    defaultPengguna: false,
    aktif: false,
  }
  const selisih = selisihField(snapshotAuditPrinter(lama), sesudah)
  if (Object.keys(selisih.sesudah).length > 0) {
    await prisma.printer.update({
      where: { id: data.id },
      data: { aktif: false, defaultPengguna: false },
    })
    await catatAudit({
      aktorId: aktorId ?? userId,
      aksi: 'printer.perangkat.nonaktif',
      entitas: 'Printer',
      entitasId: data.id,
      sebelum: selisih.sebelum,
      sesudah: selisih.sesudah,
    })
  }
  return { id: data.id, dihapus: false }
}

// Printer default yang aktif — dipakai saat klien tak menyebut printer.
export async function printerDefault(
  userId?: string,
): Promise<PrinterRow | null> {
  const milikPengguna = userId
    ? await prisma.printer.findFirst({
        where: { userId, defaultPengguna: true, aktif: true },
      })
    : null
  const row =
    milikPengguna ??
    (await prisma.printer.findFirst({
      where: { default: true, aktif: true },
      orderBy: { nama: 'asc' },
    })) ??
    (await prisma.printer.findFirst({ where: { aktif: true } }))
  if (!row) return null
  return keBarisPrinter(row)
}

// Retry sekali untuk konflik transaksi/unique. Partial unique index yang
// menutup race; transaksi menjamin state lama kembali bila operasi gagal.
async function transaksiRetry<T>(
  operasi: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let percobaan = 0; percobaan < 2; percobaan++) {
    try {
      return await prisma.$transaction(operasi)
    } catch (e) {
      const kode =
        e instanceof Prisma.PrismaClientKnownRequestError ? e.code : null
      if (percobaan === 0 && (kode === 'P2002' || kode === 'P2034')) continue
      throw e
    }
  }
  throw new Error('Transaksi printer gagal')
}

async function transaksiDefault<T>(
  operasi: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return transaksiRetry(async (tx) => {
    await tx.printer.updateMany({
      where: { default: true },
      data: { default: false },
    })
    return operasi(tx)
  })
}

export async function setDefaultPrinterPerangkat(
  input: { id: string },
  userId: string,
  aktorId?: string,
): Promise<PrinterRow> {
  const data = PrinterIdSchema.parse(input)
  const lama = await prisma.printer.findFirst({
    where: { id: data.id, userId, aktif: true },
  })
  if (!lama) throw new GalatDomain('Perangkat tidak ditemukan')
  if (lama.defaultPengguna) return keBarisPrinter(lama)

  const row = await transaksiRetry(async (tx) => {
    await tx.printer.updateMany({
      where: { userId, defaultPengguna: true },
      data: { defaultPengguna: false },
    })
    return tx.printer.update({
      where: { id: data.id },
      data: { defaultPengguna: true },
    })
  })

  await catatAudit({
    aktorId: aktorId ?? userId,
    aksi: 'printer.perangkat.default',
    entitas: 'Printer',
    entitasId: data.id,
    sebelum: { defaultPengguna: false },
    sesudah: { defaultPengguna: true },
  })
  return keBarisPrinter(row)
}

export async function createPrinter(
  input: PrinterInput,
  userId?: string,
  aktorId?: string,
): Promise<{ id: string }> {
  const data = PrinterInputSchema.parse(input)
  const dataBaru = {
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
    defaultPengguna: false,
    aktif: data.aktif,
  }
  const dibuat = data.default
    ? await transaksiDefault((tx) =>
        tx.printer.create({ data: dataBaru, select: { id: true } }),
      )
    : await prisma.printer.create({ data: dataBaru, select: { id: true } })
  await catatAudit({
    aktorId: aktorId ?? userId ?? null,
    aksi: 'printer.buat',
    entitas: 'Printer',
    entitasId: dibuat.id,
    sesudah: snapshotAuditPrinter({
      nama: data.nama,
      tipe: data.tipe,
      lokasi: data.lokasi ?? null,
      perangkat: data.perangkat ?? null,
      koneksi: data.koneksi,
      vendorId: data.vendorId ?? null,
      vendorName: data.vendorName ?? null,
      serialNumber: data.serialNumber ?? null,
      productName: data.productName ?? null,
      default: data.default,
      defaultPengguna: false,
      aktif: data.aktif,
    }),
  })
  return dibuat
}

export async function updatePrinter(
  input: UpdatePrinterInput,
  aktorId?: string,
): Promise<{ id: string }> {
  const data = UpdatePrinterSchema.parse(input)
  const lama = await prisma.printer.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Printer tidak ditemukan')
  const dataUbah = {
    nama: data.nama,
    tipe: data.tipe,
    lokasi: data.lokasi ?? null,
    perangkat: data.perangkat ?? null,
    ...(data.koneksi ? { koneksi: data.koneksi } : {}),
    ...(data.vendorId !== undefined ? { vendorId: data.vendorId || null } : {}),
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
  }
  if (data.default) {
    await transaksiDefault((tx) =>
      tx.printer.update({ where: { id: data.id }, data: dataUbah }),
    )
  } else {
    await prisma.printer.update({ where: { id: data.id }, data: dataUbah })
  }

  const selisih = selisihField(
    snapshotAuditPrinter(lama),
    snapshotAuditPrinter({
      nama: data.nama,
      tipe: data.tipe,
      lokasi: data.lokasi ?? null,
      perangkat: data.perangkat ?? null,
      koneksi: data.koneksi ?? lama.koneksi,
      vendorId:
        data.vendorId !== undefined ? data.vendorId || null : lama.vendorId,
      vendorName:
        data.vendorName !== undefined
          ? data.vendorName || null
          : lama.vendorName,
      serialNumber:
        data.serialNumber !== undefined
          ? data.serialNumber || null
          : lama.serialNumber,
      productName:
        data.productName !== undefined
          ? data.productName || null
          : lama.productName,
      default: data.default,
      defaultPengguna: lama.defaultPengguna,
      aktif: data.aktif,
    }),
  )
  if (Object.keys(selisih.sesudah).length > 0) {
    await catatAudit({
      aktorId,
      aksi: 'printer.ubah',
      entitas: 'Printer',
      entitasId: data.id,
      sebelum: selisih.sebelum,
      sesudah: selisih.sesudah,
    })
  }
  return { id: data.id }
}

export async function hapusPrinter(
  input: {
    id: string
  },
  aktorId?: string,
): Promise<{ id: string }> {
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
  await catatAudit({
    aktorId,
    aksi: 'printer.hapus',
    entitas: 'Printer',
    entitasId: data.id,
    sebelum: snapshotAuditPrinter(ada),
  })
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
  userId?: string,
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

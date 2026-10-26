import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import { catatAudit, selisihField } from './audit.js'
import { GalatDomain, GalatKonflik } from './galat.js'
import {
  PrinterDeviceInputSchema,
  PrinterIdSchema,
} from '#/validations/percetakan'
import type { PrinterDeviceInput } from '#/validations/percetakan'
import type { PrinterRow } from '#/types/percetakan'
import {
  keBarisPrinter,
  snapshotAuditPrinter,
  transaksiRetry,
} from './printerUmum.js'

const BATAS_PERANGKAT = 20
const INTERVAL_SCAN_MS = 5 * 60_000

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

import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import type { Printer } from '#/generated/prisma/client.js'
import { catatAudit, selisihField } from './audit.js'
import { GalatDomain } from './galat.js'
import {
  PrinterIdSchema,
  PrinterInputSchema,
  UpdatePrinterSchema,
} from '#/validations/percetakan'
import type { PrinterInput, UpdatePrinterInput } from '#/validations/percetakan'
import type { PrinterRow } from '#/types/percetakan'

export function keBarisPrinter(p: Printer): PrinterRow {
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
export function snapshotAuditPrinter(p: {
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
export async function transaksiRetry<T>(
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

export async function transaksiDefault<T>(
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

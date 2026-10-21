import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import { catatAudit, selisihField } from './audit.js'
import { GalatDomain } from './galat.js'
import {
  BahanInputSchema,
  HapusBahanSchema,
  UpdateBahanSchema,
} from '#/validations/bahan'
import type { BahanInput, UpdateBahanInput } from '#/validations/bahan'

// Helper to get all bahan raw data with include (no pagination)
function getAllBahanRaw() {
  return prisma.bahan.findMany({
    orderBy: { nama: 'asc' },
    include: {
      _count: { select: { resep: true } },
      resep: { include: { produk: { select: { nama: true } } }, take: 5 },
    },
  })
}

export async function bahanData(opts?: { take?: number; skip?: number }) {
  // Ambil semua bahan dari DB, lalu paginasi.
  const rawBahan = await getAllBahanRaw()

  const take = opts?.take ?? rawBahan.length
  const skip = opts?.skip ?? 0
  const sliced = rawBahan.slice(skip, skip + take)

  // Bentuk keluaran untuk UI.
  return sliced.map((b) => ({
    id: b.id,
    nama: b.nama,
    satuan: b.satuan,
    jenis: b.jenis,
    stok: b.stok.toNumber(),
    stokMinimum: b.stokMinimum.toNumber(),
    hargaSatuan: b.hargaSatuan.toNumber(),
    menipis: b.stok.toNumber() <= b.stokMinimum.toNumber(),
    dipakaiProduk: b._count.resep,
    contohProduk: b.resep.map(
      (r: { produk: { nama: string } }) => r.produk.nama,
    ),
  }))
}

export async function createBahan(input: BahanInput) {
  const data = BahanInputSchema.parse(input)
  return prisma.bahan.create({
    data: {
      nama: data.nama,
      satuan: data.satuan,
      stok: data.stok,
      stokMinimum: data.stokMinimum,
      hargaSatuan: data.hargaSatuan,
    },
    select: { id: true },
  })
}

export async function updateBahan(input: UpdateBahanInput, aktorId?: string) {
  const data = UpdateBahanSchema.parse(input)
  const lama = await prisma.bahan.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Bahan tidak ditemukan')
  await prisma.bahan.update({
    where: { id: data.id },
    data: {
      nama: data.nama,
      satuan: data.satuan,
      stok: data.stok,
      stokMinimum: data.stokMinimum,
      hargaSatuan: data.hargaSatuan,
    },
  })
  // Harga beli & stok bahan sensitif: catat perubahannya ke audit log.
  const selisih = selisihField(
    {
      nama: lama.nama,
      satuan: lama.satuan,
      stok: lama.stok,
      stokMinimum: lama.stokMinimum,
      hargaSatuan: lama.hargaSatuan,
    },
    {
      nama: data.nama,
      satuan: data.satuan,
      stok: data.stok,
      stokMinimum: data.stokMinimum,
      hargaSatuan: data.hargaSatuan,
    },
  )
  if (Object.keys(selisih.sesudah).length > 0) {
    await catatAudit({
      aktorId,
      aksi: 'bahan.ubah',
      entitas: 'Bahan',
      entitasId: data.id,
      sebelum: selisih.sebelum,
      sesudah: selisih.sesudah,
    })
  }
  return { id: data.id }
}

export async function hapusBahan(input: { id: string }, aktorId?: string) {
  const data = HapusBahanSchema.parse(input)
  const lama = await prisma.bahan.findUnique({
    where: { id: data.id },
    include: { _count: { select: { resep: true } } },
  })
  if (!lama) throw new GalatDomain('Bahan tidak ditemukan')
  if (lama._count.resep > 0) {
    throw new GalatDomain(
      `Bahan dipakai ${lama._count.resep} resep — hapus dari resep dulu`,
    )
  }
  try {
    await prisma.bahan.delete({ where: { id: data.id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      throw new GalatDomain('Bahan tidak bisa dihapus (masih terpakai)')
    }
    throw e
  }
  await catatAudit({
    aktorId,
    aksi: 'bahan.hapus',
    entitas: 'Bahan',
    entitasId: data.id,
    sesudah: {
      nama: lama.nama,
      satuan: lama.satuan,
      stok: lama.stok,
      hargaSatuan: lama.hargaSatuan,
    },
  })
  return { id: data.id }
}

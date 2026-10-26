import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import { catatAudit, selisihField } from './audit.js'
import { GalatDomain } from './galat.js'
import {
  BahanInputSchema,
  HapusBahanSchema,
  UpdateBahanSchema,
} from '#/validations/bahan'
import type {
  BahanInput,
  BahanQueryInput,
  UpdateBahanInput,
} from '#/validations/bahan'

const pilihBahan = {
  id: true,
  nama: true,
  satuan: true,
  jenis: true,
  stok: true,
  stokMinimum: true,
  hargaSatuan: true,
  resep: {
    include: { produk: { select: { nama: true } } },
    take: 5,
  },
  _count: { select: { resep: true } },
} satisfies Prisma.BahanSelect

const bentukBahan = (
  b: Prisma.BahanGetPayload<{ select: typeof pilihBahan }>,
) => ({
  id: b.id,
  nama: b.nama,
  satuan: b.satuan,
  jenis: b.jenis,
  stok: b.stok.toNumber(),
  stokMinimum: b.stokMinimum.toNumber(),
  hargaSatuan: b.hargaSatuan.toNumber(),
  menipis: b.stok.lte(b.stokMinimum),
  dipakaiProduk: b._count.resep,
  contohProduk: b.resep.map((r) => r.produk.nama),
})

// Paginasi + pencarian + filter di database, bukan di memori.
export async function bahanPage(query: BahanQueryInput) {
  const q = query.q?.trim()
  const cari: Prisma.BahanWhereInput = q
    ? {
        OR: [
          { nama: { contains: q, mode: 'insensitive' } },
          { satuan: { contains: q, mode: 'insensitive' } },
          { jenis: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}

  // Perbandingan antar-kolom (stok <= stokMinimum) memakai field reference.
  const menipis: Prisma.BahanWhereInput = {
    stok: { lte: prisma.bahan.fields.stokMinimum },
  }
  const where: Prisma.BahanWhereInput =
    query.filter === 'menipis' ? { AND: [cari, menipis] } : cari

  const urut: Prisma.BahanOrderByWithRelationInput =
    query.sort === 'satuan'
      ? { satuan: query.arah }
      : query.sort === 'stok'
        ? { stok: query.arah }
        : query.sort === 'minimum'
          ? { stokMinimum: query.arah }
          : { nama: query.arah }

  const [total, jumlahMenipis, raw] = await Promise.all([
    prisma.bahan.count({ where }),
    prisma.bahan.count({ where: { AND: [cari, menipis] } }),
    prisma.bahan.findMany({
      where,
      orderBy: urut,
      skip: query.skip,
      take: query.take,
      select: pilihBahan,
    }),
  ])

  return {
    baris: raw.map(bentukBahan),
    total,
    menipis: jumlahMenipis,
  }
}

// Kompatibilitas untuk pemakai lama (test/internal): array tanpa metadata.
export async function bahanData(opts?: {
  take?: number
  skip?: number
  q?: string
  filter?: 'semua' | 'menipis'
}) {
  const hasil = await bahanPage({
    take: opts?.take ?? 10_000,
    skip: opts?.skip ?? 0,
    q: opts?.q,
    filter: opts?.filter ?? 'semua',
    sort: 'nama',
    arah: 'asc',
  })
  return hasil.baris
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

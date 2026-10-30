import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client.js'
import { redisCacheKey, cacheGet, cacheSet } from '#/lib/redisCache'
import { nonHapus } from './nonHapus.js'
import { FILTER_TRANSAKSI_TERJUAL } from './transaksiTerjual.js'
import type { ProdukKartu } from '#/types/produk'
import type { ProdukQueryInput } from '#/validations/produk'

export type { ProdukKartu } from '#/types/produk'

// ─── Kueri master produk ───

const pilihProduk = {
  id: true,
  nama: true,
  sku: true,
  barcode: true,
  gambar: true,
  harga: true,
  stok: true,
  aktif: true,
  kategoriId: true,
  kategori: { select: { nama: true } },
  resep: {
    select: {
      bahanId: true,
      jumlah: true,
      bahan: { select: { nama: true, satuan: true } },
    },
  },
  _count: { select: { item: true } },
} satisfies Prisma.ProdukSelect

const bentukProduk = (
  p: Prisma.ProdukGetPayload<{ select: typeof pilihProduk }>,
) => ({
  id: p.id,
  nama: p.nama,
  sku: p.sku,
  barcode: p.barcode,
  gambar: p.gambar,
  harga: p.harga.toNumber(),
  stok: p.stok,
  aktif: p.aktif,
  kategoriId: p.kategoriId,
  kategoriNama: p.kategori?.nama ?? null,
  terjual: p._count.item,
  resep: p.resep.map((r) => ({
    bahanId: r.bahanId,
    namaBahan: r.bahan.nama,
    satuan: r.bahan.satuan,
    jumlah: r.jumlah.toNumber(),
  })),
})

// Helper to get all kategori with mapping (no pagination)
async function getAllKategori() {
  const raw = await prisma.kategori.findMany({
    orderBy: { nama: 'asc' },
    select: {
      id: true,
      nama: true,
      deskripsi: true,
      _count: { select: { produk: true } },
    },
  })

  const mapped = raw.map((k) => ({
    id: k.id,
    nama: k.nama,
    deskripsi: k.deskripsi,
    jumlahProduk: k._count.produk,
  }))

  return mapped
}

// Helper to get all bahan with mapping (no pagination)
async function getAllBahan() {
  const raw = await prisma.bahan.findMany({
    orderBy: { nama: 'asc' },
    select: {
      id: true,
      nama: true,
      satuan: true,
      stok: true,
      hargaSatuan: true,
    },
  })

  const mapped = raw.map((b) => ({
    id: b.id,
    nama: b.nama,
    satuan: b.satuan,
    stok: b.stok.toNumber(),
    hargaSatuan: b.hargaSatuan.toNumber(),
  }))

  return mapped
}

// Paginasi + pencarian + filter produk di database. Kategori & bahan tetap
// dimuat penuh karena hanya dipakai sebagai opsi form (bukan tabel besar).
export async function produkPage(query: ProdukQueryInput) {
  const q = query.q?.trim()
  const where: Prisma.ProdukWhereInput = {
    ...(q
      ? {
          OR: [
            { nama: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
            { kategori: { nama: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(query.status === 'aktif'
      ? { aktif: true }
      : query.status === 'nonaktif'
        ? { aktif: false }
        : {}),
    ...(query.kategoriId ? { kategoriId: query.kategoriId } : {}),
    deletedAt: null,
  }

  const urut: Prisma.ProdukOrderByWithRelationInput =
    query.sort === 'sku'
      ? { sku: query.arah }
      : query.sort === 'harga'
        ? { harga: query.arah }
        : query.sort === 'stok'
          ? { stok: query.arah }
          : query.sort === 'aktif'
            ? { aktif: query.arah }
            : query.sort === 'kategori'
              ? { kategori: { nama: query.arah } }
              : { nama: query.arah }

  const [total, raw, kategori, bahan] = await Promise.all([
    prisma.produk.count({ where }),
    prisma.produk.findMany({
      where,
      orderBy: urut,
      skip: query.skip,
      take: query.take,
      select: pilihProduk,
    }),
    getAllKategori(),
    getAllBahan(),
  ])

  return {
    produk: raw.map(bentukProduk),
    total,
    kategori,
    bahan,
  }
}

// Kompatibilitas: sebagian pemakai lama masih meminta seluruh produk.
export async function produkData(opts?: { take?: number; skip?: number }) {
  return produkPage({
    take: opts?.take ?? 10_000,
    skip: opts?.skip ?? 0,
    sort: 'nama',
    arah: 'asc',
    status: 'semua',
  })
}

// Daftar kategori ringkas untuk endpoint `/api/v1/kategori` (tanpa produk/bahan).
export async function kategoriData() {
  return await getAllKategori()
}

// ─── Produk terpopuler (untuk carousel halaman member) ───

const BATAS_PRODUK_LANDING = 8
const MIN_PRODUK_BARIS = 4

export async function produkTerpopuler(limit = 4): Promise<ProdukKartu[]> {
  const agregat = await prisma.transaksiItem.groupBy({
    by: ['produkId'],
    where: {
      produk: { aktif: true },
      transaksi: FILTER_TRANSAKSI_TERJUAL,
    },
    _sum: { qty: true },
    orderBy: { _sum: { qty: 'desc' } },
    take: limit,
  })
  const ids = agregat
    .map((a) => a.produkId)
    .filter((id): id is string => id != null)
  if (ids.length === 0) return []
  const produk = await prisma.produk.findMany({
    where: nonHapus({ id: { in: ids } }),
    select: { id: true, nama: true, harga: true, gambar: true },
  })
  const peta = new Map(produk.map((p) => [p.id, p]))
  return agregat
    .filter((a) => a.produkId != null)
    .map((a) => {
      const p = peta.get(a.produkId!)
      return {
        produkId: a.produkId!,
        nama: p?.nama ?? '-',
        harga: p ? p.harga.toNumber() : 0,
        gambar: p?.gambar ?? null,
        terjual: a._sum.qty ?? 0,
      }
    })
}

export async function produkTerbaru(
  limit = BATAS_PRODUK_LANDING,
): Promise<ProdukKartu[]> {
  const produk = await prisma.produk.findMany({
    where: nonHapus({ aktif: true }),
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, nama: true, harga: true, gambar: true },
  })

  return produk.map((p) => ({
    produkId: p.id,
    nama: p.nama,
    harga: p.harga.toNumber(),
    gambar: p.gambar,
    terjual: 0,
  }))
}

function acak<T>(data: T[]): T[] {
  const hasil = [...data]
  for (let i = hasil.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const sementara = hasil[i]
    hasil[i] = hasil[j]
    hasil[j] = sementara
  }
  return hasil
}

function lengkapiDenganAcak(
  utama: ProdukKartu[],
  semua: ProdukKartu[],
  minimum: number,
): ProdukKartu[] {
  if (utama.length >= minimum) return utama
  const idUtama = new Set(utama.map((p) => p.produkId))
  const cadangan = acak(semua.filter((p) => !idUtama.has(p.produkId))).slice(
    0,
    minimum - utama.length,
  )
  return [...utama, ...cadangan]
}

function selangSeling(
  populer: ProdukKartu[],
  baru: ProdukKartu[],
  batas: number,
): ProdukKartu[] {
  const hasil: ProdukKartu[] = []
  const terpakai = new Set<string>()
  const panjang = Math.max(populer.length, baru.length)

  for (let i = 0; i < panjang && hasil.length < batas; i += 1) {
    const kandidat: Array<ProdukKartu | undefined> = [
      i < populer.length ? populer[i] : undefined,
      i < baru.length ? baru[i] : undefined,
    ]
    for (const produk of kandidat) {
      if (!produk || terpakai.has(produk.produkId)) continue
      terpakai.add(produk.produkId)
      hasil.push(produk)
      if (hasil.length === batas) break
    }
  }

  return hasil
}

export async function produkLanding(limit = BATAS_PRODUK_LANDING) {
  // Cache hasil landing page di Redis (5 menit) — data relatif statis,
  // diinvalidasi otomatis ketika produk/barang dibuat/dihapus/diubah.
  const kunciCache = redisCacheKey(`landing:${limit}`)
  const tercache = await cacheGet<{
    populer: ProdukKartu[]
    baru: ProdukKartu[]
    campuran: ProdukKartu[]
  }>(kunciCache)
  if (tercache) return tercache

  const batas = Math.min(Math.max(limit, 1), 24)
  const aktif = await prisma.produk.findMany({
    where: nonHapus({ aktif: true }),
    select: { id: true, nama: true, harga: true, gambar: true },
  })

  if (aktif.length === 0) {
    return { populer: [], baru: [], campuran: [] }
  }

  const semua: ProdukKartu[] = aktif.map((p) => ({
    produkId: p.id,
    nama: p.nama,
    harga: p.harga.toNumber(),
    gambar: p.gambar,
    terjual: 0,
  }))
  const [populerMentah, baru] = await Promise.all([
    produkTerpopuler(batas),
    produkTerbaru(batas),
  ])
  const minimum = Math.min(MIN_PRODUK_BARIS, semua.length)
  const populer = lengkapiDenganAcak(populerMentah, semua, minimum)

  const hasil = {
    populer,
    baru,
    campuran: lengkapiDenganAcak(
      selangSeling(populer, baru, batas),
      semua,
      minimum,
    ),
  }

  // Cache hasil (best-effort, jangan block request bila Redis down).
  await cacheSet(kunciCache, hasil, 300)
  return hasil
}

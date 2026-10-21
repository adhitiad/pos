import { prisma } from '#/db'

// ─── Kueri master produk ───

// Helper to get all produk with mapping (no pagination)
async function getAllProduk() {
  const raw = await prisma.produk.findMany({
    orderBy: { nama: 'asc' },
    select: {
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
    },
  })

  const mapped = raw.map((p) => ({
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
  }))

  return mapped
}

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

// produkData menerapkan paginasi pada data master.
export async function produkData(opts?: { take?: number; skip?: number }) {
  const [produk, kategori, bahan] = await Promise.all([
    getAllProduk(),
    getAllKategori(),
    getAllBahan(),
  ])

  const take = opts?.take ?? produk.length
  const skip = opts?.skip ?? 0

  return {
    produk: produk.slice(skip, skip + take),
    kategori,
    bahan,
  }
}

// Daftar kategori ringkas untuk endpoint `/api/v1/kategori` (tanpa produk/bahan).
export async function kategoriData() {
  return await getAllKategori()
}

// ─── Produk terpopuler (untuk carousel halaman member) ───

export type ProdukKartu = {
  produkId: string
  nama: string
  harga: number
  gambar: string | null
  terjual: number
}

const BATAS_PRODUK_LANDING = 8
const MIN_PRODUK_BARIS = 4

export async function produkTerpopuler(limit = 4): Promise<ProdukKartu[]> {
  const agregat = await prisma.transaksiItem.groupBy({
    by: ['produkId'],
    where: { produk: { aktif: true } },
    _sum: { qty: true },
    orderBy: { _sum: { qty: 'desc' } },
    take: limit,
  })
  const ids = agregat
    .map((a) => a.produkId)
    .filter((id): id is string => id != null)
  if (ids.length === 0) return []
  const produk = await prisma.produk.findMany({
    where: { id: { in: ids } },
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
    where: { aktif: true },
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
  const batas = Math.min(Math.max(limit, 1), 24)
  const aktif = await prisma.produk.findMany({
    where: { aktif: true },
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

  return {
    populer,
    baru,
    campuran: lengkapiDenganAcak(
      selangSeling(populer, baru, batas),
      semua,
      minimum,
    ),
  }
}

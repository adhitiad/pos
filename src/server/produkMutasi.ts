import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import { catatAudit, selisihField } from './audit.js'
import { hapusAset } from './cloudinary.js'
import { GalatDomain } from './galat.js'
import {
  HapusKategoriSchema,
  HapusProdukSchema,
  KategoriInputSchema,
  ProdukInputSchema,
  ToggleProdukSchema,
  UpdateProdukSchema,
} from '#/validations/produk'
import type {
  KategoriInput,
  ProdukInput,
  UpdateProdukInput,
} from '#/validations/produk'

const kosongKeNull = (v: string | undefined) =>
  v === undefined || v.trim() === '' ? null : v.trim()

// Hapus aset Cloudinary lama di server saat gambar produk diganti/dihapus.
// Best-effort: kegagalan pembersihan tak boleh menggagalkan operasi produk.
async function bersihkanGambar(url: string | null | undefined): Promise<void> {
  if (!url || !url.includes('res.cloudinary.com')) return
  try {
    await hapusAset(url)
  } catch {
    // diabaikan (mis. Cloudinary belum dikonfigurasi) — bukan galat fatal
  }
}

function pesanUnik(e: unknown, konteks: string): GalatDomain {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new GalatDomain(`${konteks} sudah dipakai`)
  }
  throw e
}

// Pastikan kategori yang dirujuk produk benar-benar ada.
async function pastikanKategoriAda(kategoriId: string | undefined) {
  if (!kategoriId) return
  const ada = await prisma.kategori.findUnique({ where: { id: kategoriId } })
  if (!ada) throw new GalatDomain('Kategori tidak ditemukan')
}

// Pastikan semua bahan pada resep produk tersedia.
async function pastikanBahanResepAda(
  resep: { bahanId: string; jumlah: number }[],
) {
  if (resep.length === 0) return
  const ids = [...new Set(resep.map((r) => r.bahanId))]
  const hitung = await prisma.bahan.count({ where: { id: { in: ids } } })
  if (hitung !== ids.length)
    throw new GalatDomain('Ada bahan resep yang tidak ditemukan')
}

// Catat perubahan harga/stok/nama/status produk ke audit log (AUDIT-02).
// Hanya field yang berubah yang disimpan agar log tetap ringkas.
async function catatPerubahanProduk(
  id: string,
  lama: { nama: string; harga: Prisma.Decimal; stok: number; aktif: boolean },
  baru: { nama: string; harga: number; stok: number; aktif: boolean },
  aktorId?: string,
): Promise<void> {
  const selisih = selisihField(
    {
      nama: lama.nama,
      harga: lama.harga,
      stok: lama.stok,
      aktif: lama.aktif,
    },
    { nama: baru.nama, harga: baru.harga, stok: baru.stok, aktif: baru.aktif },
  )
  if (Object.keys(selisih.sesudah).length === 0) return
  await catatAudit({
    aktorId,
    aksi: 'produk.ubah',
    entitas: 'Produk',
    entitasId: id,
    sebelum: selisih.sebelum,
    sesudah: selisih.sesudah,
  })
}

// ─── Mutasi produk ───

export async function createProduk(input: ProdukInput) {
  const data = ProdukInputSchema.parse(input)
  await pastikanKategoriAda(data.kategoriId)
  await pastikanBahanResepAda(data.resep)
  try {
    return await prisma.produk.create({
      data: {
        nama: data.nama,
        sku: kosongKeNull(data.sku),
        barcode: kosongKeNull(data.barcode),
        gambar: kosongKeNull(data.gambar),
        harga: data.harga,
        stok: data.stok,
        kategoriId: kosongKeNull(data.kategoriId),
        aktif: data.aktif,
        resep: {
          create: data.resep.map((r) => ({
            bahanId: r.bahanId,
            jumlah: r.jumlah,
          })),
        },
      },
      select: { id: true },
    })
  } catch (e) {
    throw pesanUnik(e, 'SKU/barcode')
  }
}

export async function updateProduk(input: UpdateProdukInput, aktorId?: string) {
  const data = UpdateProdukSchema.parse(input)
  const lama = await prisma.produk.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Produk tidak ditemukan')
  await pastikanKategoriAda(data.kategoriId)
  await pastikanBahanResepAda(data.resep)
  try {
    await prisma.$transaction([
      prisma.produk.update({
        where: { id: data.id },
        data: {
          nama: data.nama,
          sku: kosongKeNull(data.sku),
          barcode: kosongKeNull(data.barcode),
          gambar: kosongKeNull(data.gambar),
          harga: data.harga,
          stok: data.stok,
          kategoriId: kosongKeNull(data.kategoriId),
          aktif: data.aktif,
        },
      }),
      prisma.produkBahan.deleteMany({ where: { produkId: data.id } }),
      prisma.produkBahan.createMany({
        data: data.resep.map((r) => ({
          produkId: data.id,
          bahanId: r.bahanId,
          jumlah: r.jumlah,
        })),
      }),
    ])
    // Gambar lama sudah tak dipakai → hapus asetnya di Cloudinary.
    const gambarBaru = kosongKeNull(data.gambar)
    if (lama.gambar && lama.gambar !== gambarBaru)
      await bersihkanGambar(lama.gambar)
    await catatPerubahanProduk(data.id, lama, data, aktorId)
    return { id: data.id }
  } catch (e) {
    throw pesanUnik(e, 'SKU/barcode')
  }
}

export async function toggleProduk(
  input: { id: string; aktif: boolean },
  aktorId?: string,
) {
  const data = ToggleProdukSchema.parse(input)
  const lama = await prisma.produk.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Produk tidak ditemukan')
  await prisma.produk.update({
    where: { id: data.id },
    data: { aktif: data.aktif },
  })
  if (lama.aktif !== data.aktif) {
    await catatAudit({
      aktorId,
      aksi: 'produk.ubah',
      entitas: 'Produk',
      entitasId: data.id,
      sebelum: { aktif: lama.aktif },
      sesudah: { aktif: data.aktif },
    })
  }
  return { id: data.id }
}

export async function hapusProduk(input: { id: string }, aktorId?: string) {
  const data = HapusProdukSchema.parse(input)
  const lama = await prisma.produk.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Produk tidak ditemukan')
  await prisma.produk.delete({ where: { id: data.id } })
  await bersihkanGambar(lama.gambar)
  await catatAudit({
    aktorId,
    aksi: 'produk.hapus',
    entitas: 'Produk',
    entitasId: data.id,
    sesudah: {
      nama: lama.nama,
      sku: lama.sku,
      harga: lama.harga,
      stok: lama.stok,
    },
  })
  return { id: data.id }
}

// ─── Mutasi kategori ───

export async function createKategori(input: KategoriInput) {
  const data = KategoriInputSchema.parse(input)
  try {
    return await prisma.kategori.create({
      data: {
        nama: data.nama,
        deskripsi: kosongKeNull(data.deskripsi) ?? undefined,
      },
      select: { id: true },
    })
  } catch (e) {
    throw pesanUnik(e, 'Kategori')
  }
}

export async function hapusKategori(input: { id: string }, aktorId?: string) {
  const data = HapusKategoriSchema.parse(input)
  const lama = await prisma.kategori.findUnique({
    where: { id: data.id },
    include: { _count: { select: { produk: true } } },
  })
  if (!lama) throw new GalatDomain('Kategori tidak ditemukan')
  if (lama._count.produk > 0) {
    throw new GalatDomain(
      `Kategori dipakai ${lama._count.produk} produk — pindahkan dulu`,
    )
  }
  await prisma.kategori.delete({ where: { id: data.id } })
  await catatAudit({
    aktorId,
    aksi: 'kategori.hapus',
    entitas: 'Kategori',
    entitasId: data.id,
    sesudah: { nama: lama.nama, deskripsi: lama.deskripsi },
  })
  return { id: data.id }
}

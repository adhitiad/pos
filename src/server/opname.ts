import { prisma } from '#/db'
import type { SimpanOpnameInput, DataOpnameInput } from '#/validations/opname'
import { SimpanOpnameSchema, DataOpnameSchema } from '#/validations/opname'
import { GalatDomain } from './galat.js'
import { kodeHarian, nomorBerikut } from './penomoran.js'

// ─── Stok Opname ───
// Mencatat stok fisik per produk/bahan, menyimpan selisih vs stok tercatat,
// dan menerapkan koreksi ke stok sistem — semua dalam satu transaksi.

interface ItemOpnameHitung {
  jenis: 'PRODUK' | 'BAHAN'
  id: string
  nama: string
  stokTercatat: number
  stokFisik: number
  selisih: number
}

export async function simpanOpname(kasirId: string, input: SimpanOpnameInput) {
  const data = SimpanOpnameSchema.parse(input)

  return await prisma.$transaction(async (tx) => {
    // Muat stok tercatat semua item sebelum menulis.
    const hitung: ItemOpnameHitung[] = []
    for (const it of data.items) {
      if (data.jenis === 'PRODUK') {
        const produk = await tx.produk.findUnique({ where: { id: it.id } })
        if (!produk) throw new GalatDomain('Produk tidak ditemukan')
        hitung.push({
          jenis: 'PRODUK',
          id: it.id,
          nama: produk.nama,
          stokTercatat: produk.stok,
          stokFisik: it.stokFisik,
          selisih: it.stokFisik - produk.stok,
        })
      } else {
        const bahan = await tx.bahan.findUnique({ where: { id: it.id } })
        if (!bahan) throw new GalatDomain('Bahan tidak ditemukan')
        hitung.push({
          jenis: 'BAHAN',
          id: it.id,
          nama: bahan.nama,
          stokTercatat: bahan.stok.toNumber(),
          stokFisik: it.stokFisik,
          selisih: it.stokFisik - bahan.stok.toNumber(),
        })
      }
    }

    const nomor = await nomorBerikut(tx, 'transaksi', kodeHarian('OP'))
    const opname = await tx.stokOpname.create({
      data: {
        nomor,
        kasirId,
        jenis: data.jenis,
        catatan: data.catatan ?? null,
        items: {
          create: hitung.map((h) => ({
            ...(h.jenis === 'PRODUK' ? { produkId: h.id } : { bahanId: h.id }),
            stokTercatat: h.stokTercatat,
            stokFisik: h.stokFisik,
            selisih: h.selisih,
          })),
        },
      },
    })

    // Terapkan koreksi ke stok sistem (stok = stok fisik).
    for (const h of hitung) {
      if (h.jenis === 'PRODUK') {
        await tx.produk.update({
          where: { id: h.id },
          data: { stok: h.stokFisik },
        })
      } else {
        await tx.bahan.update({
          where: { id: h.id },
          data: { stok: h.stokFisik },
        })
      }
    }

    return { id: opname.id, nomor: opname.nomor, jenis: opname.jenis }
  })
}

// Daftar master aktif untuk dropdown form opname (produk atau bahan).
export async function daftarMasterAktif(jenis: 'PRODUK' | 'BAHAN') {
  if (jenis === 'PRODUK') {
    const rows = await prisma.produk.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, stok: true },
    })
    return rows.map((r) => ({ id: r.id, nama: r.nama, stok: r.stok }))
  }
  const rows = await prisma.bahan.findMany({
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true, stok: true, satuan: true },
  })
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    stok: r.stok.toNumber(),
    satuan: r.satuan,
  }))
}

export async function dataOpname(input: DataOpnameInput) {
  const data = DataOpnameSchema.parse(input)
  const akhir = data.sampai
    ? new Date(`${data.sampai}T23:59:59.999`)
    : new Date()
  const awal = data.dari
    ? new Date(`${data.dari}T00:00:00`)
    : new Date(akhir.getFullYear(), akhir.getMonth(), 1)
  if (akhir < awal) throw new GalatDomain('Rentang tanggal tidak valid')

  const opnames = await prisma.stokOpname.findMany({
    where: {
      tanggal: { gte: awal, lte: akhir },
      ...(data.jenis ? { jenis: data.jenis } : {}),
    },
    orderBy: { tanggal: 'desc' },
    take: 100,
    include: {
      kasir: { select: { name: true } },
      items: {
        include: {
          produk: { select: { nama: true } },
          bahan: { select: { nama: true } },
        },
      },
    },
  })

  return {
    dari: data.dari ?? '',
    sampai: data.sampai ?? '',
    jumlahOpname: opnames.length,
    riwayat: opnames.map((o) => ({
      id: o.id,
      nomor: o.nomor,
      tanggal: o.tanggal.toISOString(),
      jenis: o.jenis,
      kasirNama: o.kasir.name,
      catatan: o.catatan,
      items: o.items.map((i) => ({
        nama: i.produk?.nama ?? i.bahan?.nama ?? '-',
        stokTercatat: i.stokTercatat.toNumber(),
        stokFisik: i.stokFisik.toNumber(),
        selisih: i.selisih.toNumber(),
      })),
    })),
  }
}

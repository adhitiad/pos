import { prisma } from '#/db'
import type { BuatReturInput, DataReturInput } from '#/validations/retur'
import { BuatReturSchema, DataReturSchema } from '#/validations/retur'
import { GalatDomain } from './galat.js'
import { kodeHarian, nomorBerikut } from './penomoran.js'
import { AKUN } from './postingHitung.js'

// ─── Retur/refund pasca-jual ───
// Membuat retur, mengembalikan stok produk & bahan (kebalikan postingan),
// dan menulis jurnal pembalik di buku besar — semua dalam satu transaksi.

interface ItemReturHitung {
  produkId: string | null
  namaProduk: string
  qty: number
  hargaSatuan: number
  subtotal: number
}

export async function buatRetur(kasirId: string, input: BuatReturInput) {
  const data = BuatReturSchema.parse(input)

  return await prisma.$transaction(async (tx) => {
    const asal = await tx.transaksi.findUnique({
      where: { id: data.transaksiId },
      include: { items: true },
    })
    if (!asal) throw new GalatDomain('Transaksi asal tidak ditemukan')

    // Validasi item retur: harus ada di transaksi asal, qty tidak melebihi
    // yang dibeli.
    const petaItemAsal = new Map(asal.items.map((i) => [i.id, i]))
    const hitung: ItemReturHitung[] = []
    let totalRetur = 0

    for (const r of data.items) {
      const item = petaItemAsal.get(r.produkId)
      if (!item) throw new GalatDomain('Produk tidak ada di transaksi asal')
      if (item.qty < r.qty) {
        throw new GalatDomain('Qty retur melebihi qty dibeli')
      }
      const subtotal = item.harga.toNumber() * r.qty
      totalRetur += subtotal
      hitung.push({
        produkId: item.produkId ?? null,
        namaProduk: item.namaProduk,
        qty: r.qty,
        hargaSatuan: item.harga.toNumber(),
        subtotal,
      })
    }

    // Simpan retur + item retur.
    const nomor = await nomorBerikut(tx, 'transaksi', kodeHarian('RT'))
    const retur = await tx.retur.create({
      data: {
        nomor,
        transaksiId: data.transaksiId,
        kasirId,
        alasan: data.alasan,
        totalRetur,
        items: {
          create: hitung.map((h) => ({
            produkId: h.produkId,
            namaProduk: h.namaProduk,
            qty: h.qty,
            hargaSatuan: h.hargaSatuan,
            subtotal: h.subtotal,
          })),
        },
      },
    })

    // Kembalikan stok produk (increment qty) dan bahan (increment via resep).
    for (const h of hitung) {
      if (h.produkId) {
        await tx.produk.update({
          where: { id: h.produkId },
          data: { stok: { increment: h.qty } },
        })
        const produk = await tx.produk.findUnique({
          where: { id: h.produkId },
          include: { resep: { include: { bahan: true } } },
        })
        if (produk) {
          for (const resep of produk.resep) {
            const butuh = resep.jumlah.toNumber() * h.qty
            await tx.bahan.update({
              where: { id: resep.bahanId },
              data: { stok: { increment: butuh } },
            })
          }
        }
      }
    }

    // Jurnal pembalik (kebalikan postingan penjualan):
    //   Kas        debit  totalRetur
    //   Pendapatan kredit totalRetur
    const daftarAkun = await tx.akun.findMany({
      where: { kode: { in: Object.values(AKUN) } },
    })
    const idAkun = new Map(daftarAkun.map((a) => [a.kode, a.id]))
    const kas = idAkun.get(AKUN.kas)
    const pendapatan = idAkun.get(AKUN.pendapatanPenjualan)
    if (!kas || !pendapatan) {
      throw new Error('Akun Kas / Pendapatan Penjualan belum ada di CoA')
    }
    await tx.jurnal.create({
      data: {
        nomor: await nomorBerikut(tx, 'jurnal', kodeHarian('JU')),
        keterangan: `Pembalik penjualan ${asal.nomor} (retur ${nomor})`,
        entri: {
          create: [
            { akunId: kas, debit: totalRetur, kredit: 0 },
            { akunId: pendapatan, debit: 0, kredit: totalRetur },
          ],
        },
      },
    })

    return { id: retur.id, nomor: retur.nomor, totalRetur }
  })
}

// Daftar produk aktif untuk dropdown form retur.

// Ambil detail transaksi untuk form retur (produk + qty yang dibeli).
export async function detailTransaksi(transaksiId: string) {
  const t = await prisma.transaksi.findUnique({
    where: { id: transaksiId },
    include: {
      items: {
        select: {
          id: true,
          produkId: true,
          namaProduk: true,
          qty: true,
          harga: true,
        },
      },
    },
  })
  if (!t) return null
  return {
    id: t.id,
    nomor: t.nomor,
    tanggal: t.tanggal.toISOString(),
    total: t.total.toNumber(),
    items: t.items.map((i) => ({
      id: i.id,
      produkId: i.produkId ?? null,
      namaProduk: i.namaProduk,
      qty: i.qty,
      hargaSatuan: i.harga.toNumber(),
    })),
  }
}

export async function daftarProdukAktif() {
  const rows = await prisma.produk.findMany({
    where: { aktif: true },
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true, harga: true, stok: true },
  })
  return rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    stok: r.stok,
    harga: r.harga.toNumber(),
  }))
}

export async function dataRetur(input: DataReturInput) {
  const data = DataReturSchema.parse(input)
  const akhir = data.sampai
    ? new Date(`${data.sampai}T23:59:59.999`)
    : new Date()
  const awal = data.dari
    ? new Date(`${data.dari}T00:00:00`)
    : new Date(akhir.getFullYear(), akhir.getMonth(), 1)
  if (akhir < awal) throw new GalatDomain('Rentang tanggal tidak valid')

  const returs = await prisma.retur.findMany({
    where: { tanggal: { gte: awal, lte: akhir } },
    orderBy: { tanggal: 'desc' },
    take: 100,
    include: {
      kasir: { select: { name: true } },
      transaksi: { select: { nomor: true } },
      items: { select: { namaProduk: true, qty: true, subtotal: true } },
    },
  })

  return {
    dari: data.dari ?? '',
    sampai: data.sampai ?? '',
    jumlahRetur: returs.length,
    totalRetur: returs.reduce((s, r) => s + r.totalRetur.toNumber(), 0),
    riwayat: returs.map((r) => ({
      id: r.id,
      nomor: r.nomor,
      tanggal: r.tanggal.toISOString(),
      transaksiNomor: r.transaksi.nomor,
      kasirNama: r.kasir.name,
      alasan: r.alasan,
      totalRetur: r.totalRetur.toNumber(),
      items: r.items.map((i) => ({
        namaProduk: i.namaProduk,
        qty: i.qty,
        subtotal: i.subtotal.toNumber(),
      })),
    })),
  }
}

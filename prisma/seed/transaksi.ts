import type {
  MetodeBayar,
  StatusPesanan,
} from '../../src/generated/prisma/enums.js'
import { prisma } from './dasar.js'

// Transaksi demo yang konsisten: item, pembayaran, stok, poin member, dan
// jurnal berimbang dibuat dalam satu alur. Dipakai `operasional.ts`.

export interface ItemTransaksiSeed {
  sku: string
  qty: number
  modifier?: { grup: string; nama: string }[]
}

export interface PembayaranSeed {
  metode: MetodeBayar
  jumlah: number
  uangDiterima?: number
}

export interface TransaksiSeedInput {
  nomor: string
  nomorJurnal: string
  tanggal: Date
  kasirId: string | null
  shiftId?: string | null
  memberId?: string | null
  deliveryId?: string | null
  mejaId?: string | null
  statusPesanan?: StatusPesanan
  metodeBayar: MetodeBayar
  items: ItemTransaksiSeed[]
  diskon?: number
  ongkir?: number
  pajak?: number
  pajakJenis?: string | null
  catatan?: string | null
  idempotencyKey?: string
  cetakOwner?: number
  cetakKasir?: number
  pembayaran?: PembayaranSeed[]
}

const tanggalKode = (tanggal: Date) =>
  `${tanggal.getFullYear()}${String(tanggal.getMonth() + 1).padStart(2, '0')}${String(tanggal.getDate()).padStart(2, '0')}`

export const kodeDokumen = (prefix: string, tanggal: Date, urutan: number) =>
  `${prefix}-${tanggalKode(tanggal)}-${String(urutan).padStart(4, '0')}`

export async function buatTransaksiDemo(input: TransaksiSeedInput) {
  const skus = [...new Set(input.items.map((item) => item.sku))]
  const produk = await prisma.produk.findMany({
    where: { sku: { in: skus } },
    include: { resep: { include: { bahan: true } } },
  })
  const petaProduk = new Map(produk.map((p) => [p.sku ?? '', p]))
  const modifiers = await prisma.modifier.findMany({
    include: { grup: { select: { nama: true } } },
  })
  const petaModifier = new Map(
    modifiers.map((m) => [`${m.grup.nama}:${m.nama}`, m]),
  )

  const baris = input.items.map((item) => {
    const p = petaProduk.get(item.sku)
    if (!p) throw new Error(`Produk seed ${item.sku} tidak ditemukan`)
    const daftarModifier = (item.modifier ?? []).map((m) => {
      const modifier = petaModifier.get(`${m.grup}:${m.nama}`)
      if (!modifier)
        throw new Error(`Modifier seed ${m.grup}/${m.nama} tidak ditemukan`)
      return modifier
    })
    const tambahan = daftarModifier.reduce(
      (total, m) => total + m.hargaTambahan.toNumber(),
      0,
    )
    const harga = p.harga.toNumber()
    const hppSatuan = p.resep.reduce(
      (total, r) =>
        total + r.jumlah.toNumber() * r.bahan.hargaSatuan.toNumber(),
      0,
    )
    return {
      produk: p,
      namaProduk: p.nama,
      harga,
      qty: item.qty,
      subtotal: (harga + tambahan) * item.qty,
      hpp: Math.round(hppSatuan * item.qty),
      modifier: daftarModifier.map((m) => ({
        modifierId: m.id,
        qty: 1,
        hargaTambahan: m.hargaTambahan,
      })),
    }
  })

  const subtotal = baris.reduce((total, b) => total + b.subtotal, 0)
  const diskon = Math.min(input.diskon ?? 0, subtotal)
  const ongkir = input.ongkir ?? 0
  const pajak = input.pajak ?? 0
  const total = subtotal - diskon + pajak + ongkir
  const hpp = baris.reduce((totalHpp, b) => totalHpp + b.hpp, 0)
  const pembayaran =
    input.pembayaran !== undefined
      ? input.pembayaran
      : total > 0
        ? [{ metode: input.metodeBayar, jumlah: total }]
        : []
  const status = input.statusPesanan ?? 'LUNAS'
  const poinDapat =
    input.memberId && status === 'LUNAS' && pembayaran.length > 0
      ? Math.floor(total / 10_000)
      : 0
  const tunai = pembayaran
    .filter((p) => p.metode === 'TUNAI')
    .reduce((jumlah, p) => jumlah + p.jumlah, 0)
  const uangDiterima = pembayaran
    .filter((p) => p.metode === 'TUNAI')
    .reduce((jumlah, p) => jumlah + (p.uangDiterima ?? p.jumlah), 0)

  const transaksi = await prisma.transaksi.create({
    data: {
      nomor: input.nomor,
      tanggal: input.tanggal,
      createdAt: input.tanggal,
      updatedAt: input.tanggal,
      memberId: input.memberId ?? null,
      kasirId: input.kasirId,
      shiftId: input.shiftId ?? null,
      sumber: input.kasirId ? 'POS' : 'ONLINE',
      dibayarPada: pembayaran.length > 0 ? input.tanggal : null,
      dibayarVia: pembayaran.length > 0 ? 'MANUAL' : null,
      stokTerpotong: true,
      deliveryId: input.deliveryId ?? null,
      mejaId: input.mejaId ?? null,
      ongkir,
      subtotal,
      diskon,
      pajak,
      pajakJenis: input.pajakJenis ?? null,
      total,
      poinDapat,
      metodeBayar: pembayaran[0]?.metode ?? input.metodeBayar,
      catatan: input.catatan ?? null,
      statusPesanan: status,
      uangDiterima: tunai > 0 ? uangDiterima : null,
      kembalian: tunai > 0 ? uangDiterima - tunai : null,
      idempotencyKey: input.idempotencyKey ?? null,
      waktuKlien: input.tanggal,
      hpp,
      cetakOwner: input.cetakOwner ?? 0,
      cetakKasir: input.cetakKasir ?? 0,
      items: {
        create: baris.map((b) => ({
          produkId: b.produk.id,
          namaProduk: b.namaProduk,
          harga: b.harga,
          qty: b.qty,
          subtotal: b.subtotal,
          modifiers:
            b.modifier.length > 0
              ? {
                  create: b.modifier.map((m) => ({
                    modifierId: m.modifierId,
                    qty: m.qty,
                    hargaTambahan: m.hargaTambahan,
                  })),
                }
              : undefined,
        })),
      },
      pembayaran:
        pembayaran.length > 0
          ? {
              create: pembayaran.map((p) => ({
                metode: p.metode,
                jumlah: p.jumlah,
                uangDiterima: p.metode === 'TUNAI' ? p.uangDiterima : null,
              })),
            }
          : undefined,
    },
    include: { items: true },
  })

  // Pesanan yang belum dibayar (dapur/online) tidak boleh memposting kas.
  if (pembayaran.length > 0) {
    const akun = await prisma.akun.findMany({
      where: {
        kode: { in: ['1100', '1200', '2100', '4100', '4200', '5100'] },
      },
    })
    const idAkun = new Map(akun.map((a) => [a.kode, a.id]))
    const entri = [
      { akunId: idAkun.get('1100')!, debit: total, kredit: 0 },
      { akunId: idAkun.get('4100')!, debit: 0, kredit: subtotal - diskon },
    ]
    if (ongkir > 0)
      entri.push({ akunId: idAkun.get('4200')!, debit: 0, kredit: ongkir })
    if (pajak > 0)
      entri.push({ akunId: idAkun.get('2100')!, debit: 0, kredit: pajak })
    if (hpp > 0) {
      entri.push({ akunId: idAkun.get('5100')!, debit: hpp, kredit: 0 })
      entri.push({ akunId: idAkun.get('1200')!, debit: 0, kredit: hpp })
    }
    await prisma.jurnal.create({
      data: {
        nomor: input.nomorJurnal,
        tanggal: input.tanggal,
        createdAt: input.tanggal,
        keterangan: `Penjualan ${input.nomor}`,
        transaksiId: transaksi.id,
        entri: { create: entri },
      },
    })
  }

  const qtyProduk = new Map<string, number>()
  const qtyBahan = new Map<string, number>()
  for (const b of baris) {
    qtyProduk.set(b.produk.id, (qtyProduk.get(b.produk.id) ?? 0) + b.qty)
    for (const r of b.produk.resep) {
      qtyBahan.set(
        r.bahanId,
        (qtyBahan.get(r.bahanId) ?? 0) + r.jumlah.toNumber() * b.qty,
      )
    }
  }
  for (const [id, qty] of qtyProduk) {
    await prisma.produk.update({
      where: { id },
      data: { stok: { decrement: qty } },
    })
  }
  for (const [id, qty] of qtyBahan) {
    await prisma.bahan.update({
      where: { id },
      data: { stok: { decrement: qty } },
    })
  }

  if (input.memberId && poinDapat > 0) {
    const member = await prisma.member.findUnique({
      where: { id: input.memberId },
    })
    if (member) {
      const totalBelanja = member.totalBelanja.toNumber() + total
      const tier =
        totalBelanja >= 10_000_000
          ? 'GOLD'
          : totalBelanja >= 3_000_000
            ? 'SILVER'
            : 'BRONZE'
      await prisma.member.update({
        where: { id: member.id },
        data: {
          poin: { increment: poinDapat },
          totalBelanja,
          tier,
        },
      })
    }
  }

  return transaksi
}

import { prisma } from '#/db'
import type {
  CetakStrukInput,
  UpdateStatusPesananInput,
} from '#/validations/transaksi'
import {
  CetakStrukSchema,
  UpdateStatusPesananSchema,
} from '#/validations/transaksi'
import { GalatDomain } from './galat.js'
import { batalkanPesananOnline } from './pembayaranPesanan.js'

// ─── KDS (dapur) ───

export async function dapurData() {
  const transaksi = await prisma.transaksi.findMany({
    where: {
      OR: [
        { statusPesanan: { in: ['MENUNGGU', 'DIPROSES'] } },
        // Pesanan online yang sudah selesai di dapur tetap tampil sampai
        // pembayarannya dikonfirmasi.
        {
          sumber: 'ONLINE',
          dibayarPada: null,
          statusPesanan: { notIn: ['DIBATALKAN', 'LUNAS'] },
        },
      ],
    },
    orderBy: [{ meja: { nomor: 'asc' } }, { tanggal: 'asc' }],
    include: {
      items: {
        include: {
          modifiers: { include: { modifier: true } },
          produk: { select: { nama: true } },
        },
        orderBy: { namaProduk: 'asc' },
      },
      member: { select: { id: true, nama: true } },
      meja: { select: { id: true, nomor: true, nama: true } },
      pembayaran: true,
    },
  })
  return transaksi.map((t) => ({
    id: t.id,
    nomor: t.nomor,
    tanggal: t.tanggal.toISOString(),
    statusPesanan: t.statusPesanan,
    sumber: t.sumber,
    dibayarPada: t.dibayarPada?.toISOString() ?? null,
    metodeBayar: t.metodeBayar,
    total: t.total.toNumber(),
    cetakOwner: t.cetakOwner,
    cetakKasir: t.cetakKasir,
    meja: t.meja
      ? { id: t.meja.id, nomor: t.meja.nomor, nama: t.meja.nama }
      : null,
    member: t.member ? { id: t.member.id, nama: t.member.nama } : null,
    items: t.items.map((i) => ({
      id: i.id,
      produkId: i.produkId,
      produkNama: i.produk?.nama ?? i.namaProduk,
      qty: i.qty,
      harga: i.harga.toNumber(),
      subtotal: i.subtotal.toNumber(),
      modifiers: i.modifiers.map((m) => ({
        modifier: m.modifier.nama,
        tambahan: m.hargaTambahan.toNumber(),
        qty: m.qty,
        catatan: m.catatan,
      })),
    })),
    pembayaran: t.pembayaran.map((p) => ({
      metode: p.metode,
      jumlah: p.jumlah.toNumber(),
    })),
  }))
}

export async function updateStatusPesanan(
  input: UpdateStatusPesananInput,
  aktorId?: string | null,
) {
  const data = UpdateStatusPesananSchema.parse(input)
  const lama = await prisma.transaksi.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Transaksi tidak ditemukan')

  if (lama.sumber === 'ONLINE') {
    if (data.statusPesanan === 'DIBATALKAN') {
      return await batalkanPesananOnline(data.id, aktorId)
    }
    if (data.statusPesanan === 'LUNAS') {
      throw new GalatDomain(
        'Gunakan tombol Tandai lunas untuk menyelesaikan pembayaran online',
      )
    }
  }

  // Transaksi POS sudah dibayar & stoknya terpotong saat posting. Membiarkan
  // status DIBATALKAN di sini akan menghilangkan penjualan dari laporan tanpa
  // pembalik stok/jurnal. Refund POS wajib lewat retur.
  if (lama.sumber !== 'ONLINE' && data.statusPesanan === 'DIBATALKAN') {
    throw new GalatDomain(
      'Transaksi POS tidak dapat dibatalkan; gunakan retur untuk refund',
    )
  }

  await prisma.transaksi.update({
    where: { id: data.id },
    data: { statusPesanan: data.statusPesanan },
  })
  return { id: data.id, statusPesanan: data.statusPesanan }
}

export async function cetakStruk(input: CetakStrukInput) {
  const data = CetakStrukSchema.parse(input)
  const t = await prisma.transaksi.findUnique({ where: { id: data.id } })
  if (!t) throw new GalatDomain('Transaksi tidak ditemukan')
  await prisma.transaksi.update({
    where: { id: data.id },
    data:
      data.peran === 'OWNER'
        ? { cetakOwner: { increment: 1 } }
        : { cetakKasir: { increment: 1 } },
  })
  return {
    id: data.id,
    cetakOwner: t.cetakOwner + (data.peran === 'OWNER' ? 1 : 0),
    cetakKasir: t.cetakKasir + (data.peran === 'KASIR' ? 1 : 0),
  }
}

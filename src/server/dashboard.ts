import { prisma } from '#/db'

import { FILTER_TRANSAKSI_TERJUAL } from './transaksiTerjual.js'

// Data ringkas khusus dashboard. Sengaja TIDAK memakai `kasirData` agar
// dashboard tidak ikut memuat katalog produk, modifier, member, dan delivery
// yang hanya dibutuhkan halaman kasir.
export async function dashboardData() {
  const awalHari = new Date()
  awalHari.setHours(0, 0, 0, 0)
  const whereHariIni = {
    tanggal: { gte: awalHari },
    ...FILTER_TRANSAKSI_TERJUAL,
  }

  const [agregat, transaksiHariIni, jumlahProduk, stokMenipis, jumlahMember] =
    await Promise.all([
      prisma.transaksi.aggregate({
        where: whereHariIni,
        _sum: { total: true, subtotal: true, hpp: true },
        _count: { id: true },
      }),
      prisma.transaksi.findMany({
        where: whereHariIni,
        orderBy: { tanggal: 'desc' },
        take: 50,
        select: {
          id: true,
          nomor: true,
          tanggal: true,
          total: true,
          member: { select: { id: true, nama: true, telepon: true } },
          items: {
            select: {
              id: true,
              produkId: true,
              qty: true,
              harga: true,
              subtotal: true,
              produk: { select: { nama: true } },
            },
          },
        },
      }),
      prisma.produk.count(),
      prisma.produk.count({ where: { stok: { lte: 0 } } }),
      prisma.member.count(),
    ])

  const kotor =
    (agregat._sum.subtotal?.toNumber() ?? 0) -
    (agregat._sum.hpp?.toNumber() ?? 0)

  return {
    penjualanHariIni: {
      total: agregat._sum.total?.toNumber() ?? 0,
      jumlah: agregat._count.id,
    },
    keuntunganHariIni: { kotor, bersih: kotor },
    transaksiHariIni: transaksiHariIni.map((t) => ({
      id: t.id,
      nomor: t.nomor,
      tanggal: t.tanggal.toISOString(),
      total: t.total.toNumber(),
      member: t.member
        ? { id: t.member.id, nama: t.member.nama, telepon: t.member.telepon }
        : null,
      items: t.items.map((i) => ({
        id: i.id,
        produkId: i.produkId,
        produkNama: i.produk?.nama ?? '-',
        qty: i.qty,
        harga: i.harga.toNumber(),
        subtotal: i.subtotal.toNumber(),
      })),
    })),
    jumlahProduk,
    stokMenipis,
    jumlahMember,
  }
}

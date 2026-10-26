import { prisma } from '#/db'
import { pengaturanData } from './pengaturan.js'
import { FILTER_TRANSAKSI_TERJUAL } from './transaksiTerjual.js'

// Profil & riwayat milik pengguna yang sedang login — dipakai aplikasi member
// (Expo) yang tak boleh akses endpoint master milik owner.
//
// Relasi member↔user: tabel `Member` tak punya FK ke `User`, jadi Dicocokkan
// lewat email (satu-satunya identitas yang sama-sama dimiliki).
export async function profilSaya(input: { email: string }) {
  const email = input.email.trim().toLowerCase()
  const { riwayatBelanja: riwayatAktif } = await pengaturanData()

  const member = await prisma.member.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      id: true,
      nama: true,
      telepon: true,
      alamat: true,
      poin: true,
      totalBelanja: true,
      diskonPersen: true,
      tier: true,
    },
  })

  if (!member) {
    return { member: null, riwayatAktif, transaksi: [] }
  }

  const transaksi = riwayatAktif
    ? await prisma.transaksi.findMany({
        where: { memberId: member.id, ...FILTER_TRANSAKSI_TERJUAL },
        orderBy: { tanggal: 'desc' },
        take: 50,
        select: {
          id: true,
          nomor: true,
          tanggal: true,
          subtotal: true,
          diskon: true,
          pajak: true,
          total: true,
          metodeBayar: true,
          items: {
            select: {
              id: true,
              namaProduk: true,
              qty: true,
              harga: true,
              subtotal: true,
            },
          },
        },
      })
    : []

  return {
    member: {
      id: member.id,
      nama: member.nama,
      telepon: member.telepon,
      alamat: member.alamat,
      poin: member.poin,
      totalBelanja: member.totalBelanja.toNumber(),
      diskonPersen: member.diskonPersen?.toNumber() ?? null,
      tier: member.tier,
    },
    riwayatAktif,
    transaksi: transaksi.map((t) => ({
      id: t.id,
      nomor: t.nomor,
      tanggal: t.tanggal.toISOString(),
      subtotal: t.subtotal.toNumber(),
      diskon: t.diskon.toNumber(),
      pajak: t.pajak.toNumber(),
      total: t.total.toNumber(),
      metodeBayar: t.metodeBayar,
      items: t.items.map((it) => ({
        id: it.id,
        namaProduk: it.namaProduk,
        qty: it.qty,
        harga: it.harga.toNumber(),
        subtotal: it.subtotal.toNumber(),
      })),
    })),
  }
}

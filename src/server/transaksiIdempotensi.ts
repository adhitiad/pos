import { prisma } from '#/db'
import type { HasilTransaksiRingkas } from '#/types/transaksi'

// Idempotensi untuk antrean offline: klien membuat kunci stabil per transaksi
// (uuid buatan klien). Retry — baik karena timeout jaringan maupun karena
// antrean offline dikirim ulang — memakai kunci yang sama, sehingga transaksi
// tak terposting dua kali (stok & pendapatan tak dobel).

// Cari id transaksi yang sudah terposting untuk kunci idempotensi tertentu.
export async function cariIdTransaksiByKey(
  idempotencyKey: string,
): Promise<string | null> {
  const row = await prisma.transaksi.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  })
  return row?.id ?? null
}

// Muat ulang hasil transaksi yang sudah ada dalam bentuk yang sama dengan
// hasil posting, supaya klien offline menerima respons identik saat retry.
export async function muatHasilReplay(
  transaksiId: string,
): Promise<HasilTransaksiRingkas | null> {
  const transaksi = await prisma.transaksi.findUnique({
    where: { id: transaksiId },
    include: {
      items: { include: { modifiers: { include: { modifier: true } } } },
      pembayaran: true,
      member: { select: { nama: true, totalBelanja: true, tier: true } },
      jurnal: { select: { id: true, nomor: true } },
    },
  })
  if (!transaksi || !transaksi.jurnal) return null

  return {
    transaksi,
    jurnal: transaksi.jurnal,
    // HPP & diskon member disimpan saat posting agar replay sama persis.
    hpp: transaksi.hpp.toNumber(),
    diskonMember: transaksi.diskonMember.toNumber(),
    // Tandai sebagai replay supaya klien tahu tak ada transaksi baru.
    replay: true,
    memberInfo: transaksi.member
      ? {
          nama: transaksi.member.nama,
          totalBelanja: transaksi.member.totalBelanja.toNumber(),
          tier: transaksi.member.tier,
        }
      : null,
  }
}

// Ambil hasil replay berdasarkan kunci idempotensi (null bila belum pernah
// terposting).
export async function muatReplayByKey(
  idempotencyKey: string,
): Promise<HasilTransaksiRingkas | null> {
  const id = await cariIdTransaksiByKey(idempotencyKey)
  if (!id) return null
  return await muatHasilReplay(id)
}

import { prisma } from '#/db'

import type { StatusPesanan } from '#/generated/prisma/enums.js'
import { kirimNotifikasi } from './notifikasiPesan.js'
// Batas waktu pembayaran untuk pesanan yang belum dibayar di kasir.
// Melewati batas ini, transaksi dianggap kadaluarsa dan dibatalkan otomatis.
export const BATAS_PEMBAYARAN_MENIT = 45

// Status transaksi yang belum dianggap "selesai" atau "dibatalkan".
const STATUS_BELUM_SELESAI: StatusPesanan[] = ['MENUNGGU', 'DIPROSES']

// ─── Cek pembayaran kadaluarsa ───
// Temukan transaksi yang belum dibayar lebih dari `menit` menit, tandai
// DIBATALKAN, catat audit, dan kirim notifikasi ke kasir. Mengembalikan ID
// transaksi yang dibatalkan agar klien bisa membersihkan cache/order-nya.
//
// Berjalan dalam satu transaksi dan berbasis batch: satu `findMany` +
// `updateMany` + `createMany`, dibatasi `BATAS_KADALUARSA_PER_SIKLUS`
// baris per siklus agar cron tidak pernah membebani DB berat.
export const BATAS_KADALUARSA_PER_SIKLUS = 100

export async function cekPembayaranKadaluarsa(
  menit: number = BATAS_PEMBAYARAN_MENIT,
) {
  const batas = new Date(Date.now() - menit * 60 * 1000)

  const dibatalkan = await prisma.$transaction(async (tx) => {
    const kadaluarsa = await tx.transaksi.findMany({
      where: {
        dibayarPada: null,
        statusPesanan: { in: STATUS_BELUM_SELESAI },
        createdAt: { lt: batas },
      },
      select: { id: true, nomor: true, kasirId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: BATAS_KADALUARSA_PER_SIKLUS,
    })
    if (kadaluarsa.length === 0) return []

    // Guard idempotensi: baris yang sudah berubah diperlakukan bersyarat
    // dengan kondisi awal sehingga diproses sekali saja.
    await tx.transaksi.updateMany({
      where: {
        id: { in: kadaluarsa.map((t) => t.id) },
        dibayarPada: null,
        statusPesanan: { in: STATUS_BELUM_SELESAI },
      },
      data: { statusPesanan: 'DIBATALKAN' },
    })
    await tx.auditLog.createMany({
      data: kadaluarsa.map((t) => ({
        userId: t.kasirId ?? null,
        action: 'pembayaran.kadaluarsa',
        entity: 'Transaksi',
        entityId: t.id,
        catatan: `Pembayaran tidak diselesaikan dalam ${menit} menit sejak ${t.createdAt.toISOString()}; transaksi dibatalkan otomatis dan cache pengguna dibersihkan.`,
      })),
    })
    return kadaluarsa
  })

  // Notifikasi dikirim di luar transaksi DB agar tidak memperpanjang lock.
  for (const t of dibatalkan) {
    if (t.kasirId) {
      await kirimNotifikasi(t.kasirId, {
        tipe: 'INFO',
        judul: 'Pembayaran kadaluarsa',
        pesan: `Transaksi ${t.nomor} tidak dibayar dalam ${menit} menit dan telah dibatalkan. Cache pengguna dibersihkan.`,
        entitasId: t.id,
      })
    }
  }

  return {
    menit,
    batas: batas.toISOString(),
    dibatalkan: dibatalkan.length,
    transaksi: dibatalkan.map(({ id, nomor, kasirId }) => ({
      id,
      nomor,
      kasirId,
    })),
  }
}

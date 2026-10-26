import { prisma } from '#/db'
import type { InputKonfirmasiPembayaran } from '#/types/pesanan'
import type { HasilTransaksiRingkas } from '#/types/transaksi'
import { GalatDomain, GalatKonflik } from './galat.js'
import { kirimAlertFraud } from './fraudAlert.js'
import { kodeHarian, nomorBerikut } from './penomoran.js'
import { RUPIAH_PER_POIN } from './poin.js'
import { AKUN, bangunEntriJurnal } from './postingHitung.js'
import { terapkanPoinMember } from './postingMember.js'
import {
  kebutuhanStokTransaksi,
  kurangiStok,
  kembalikanStok,
} from './postingStok.js'
import { muatHasilTransaksi } from './transaksiIdempotensi.js'

export type { InputKonfirmasiPembayaran } from '#/types/pesanan'

// Konfirmasi pembayaran pesanan online. Stok dipotong, poin diberikan, dan
// jurnal dibuat tepat sekali di sini. Klaim `dibayarPada` memakai updateMany
// bersyarat agar retry manual/webhook tidak menggandakan efek samping.
export async function tandaiPesananLunas(
  input: InputKonfirmasiPembayaran,
): Promise<HasilTransaksiRingkas> {
  await prisma.$transaction(async (tx) => {
    const transaksi = await tx.transaksi.findUnique({
      where: { id: input.id },
      include: {
        items: {
          select: {
            produkId: true,
            qty: true,
            produk: {
              select: {
                resep: { select: { bahanId: true, jumlah: true } },
              },
            },
          },
        },
        member: {
          select: {
            id: true,
            nama: true,
            poin: true,
            diskonPersen: true,
            totalBelanja: true,
            tier: true,
          },
        },
        jurnal: { select: { id: true } },
        pembayaran: { select: { id: true } },
      },
    })
    if (!transaksi) throw new GalatDomain('Pesanan tidak ditemukan')
    if (transaksi.sumber !== 'ONLINE') {
      throw new GalatDomain(
        'Konfirmasi pembayaran ini hanya untuk pesanan online',
      )
    }
    if (transaksi.statusPesanan === 'DIBATALKAN') {
      throw new GalatDomain('Pesanan sudah dibatalkan')
    }
    if (transaksi.dibayarPada) return

    const total = transaksi.total.toNumber()
    if (input.jumlahDibayar != null && input.jumlahDibayar !== total) {
      throw new GalatDomain('Jumlah pembayaran tidak sesuai total pesanan')
    }

    if (input.paymentRef) {
      const dipakai = await tx.transaksi.findFirst({
        where: {
          paymentRef: input.paymentRef,
          NOT: { id: transaksi.id },
        },
        select: { id: true },
      })
      if (dipakai) {
        throw new GalatKonflik(
          'PAYMENT_REF_DIGUNAKAN',
          'Referensi pembayaran sudah dipakai pesanan lain',
        )
      }
    }

    const klaim = await tx.transaksi.updateMany({
      where: {
        id: transaksi.id,
        sumber: 'ONLINE',
        dibayarPada: null,
        statusPesanan: { not: 'DIBATALKAN' },
      },
      data: {
        dibayarPada: new Date(),
        dibayarVia: input.via,
        ...(input.paymentRef ? { paymentRef: input.paymentRef } : {}),
      },
    })
    if (klaim.count === 0) {
      const terbaru = await tx.transaksi.findUnique({
        where: { id: transaksi.id },
        select: { dibayarPada: true, statusPesanan: true },
      })
      if (terbaru?.dibayarPada) return
      throw new GalatDomain('Pesanan tidak bisa dibayar')
    }

    if (!transaksi.stokTerpotong) {
      await kurangiStok(tx, await kebutuhanStokTransaksi(tx, transaksi.id))
    }

    let poinDapat = 0
    if (transaksi.member) {
      poinDapat = Math.floor(total / RUPIAH_PER_POIN)
      await terapkanPoinMember(
        tx,
        {
          member: transaksi.member,
          poinTerpakai: transaksi.poinPakai,
          diskonMember: transaksi.diskonMember.toNumber(),
        },
        total,
      )
    }

    await tx.transaksi.update({
      where: { id: transaksi.id },
      data: { stokTerpotong: true, poinDapat },
    })

    if (!transaksi.jurnal) {
      const daftarAkun = await tx.akun.findMany({
        where: { kode: { in: Object.values(AKUN) } },
      })
      const idAkun = new Map(daftarAkun.map((a) => [a.kode, a.id]))
      const entri = bangunEntriJurnal({
        idAkun,
        subtotal: transaksi.subtotal.toNumber(),
        diskonTotal: transaksi.diskon.toNumber(),
        ongkir: transaksi.ongkir.toNumber(),
        pajak: transaksi.pajak.toNumber(),
        hppTotal: transaksi.hpp.toNumber(),
        total,
      })
      await tx.jurnal.create({
        data: {
          nomor: await nomorBerikut(tx, 'jurnal', kodeHarian('JU')),
          keterangan: `Penjualan ${transaksi.nomor}`,
          transaksiId: transaksi.id,
          entri: { create: entri },
        },
      })
    }

    if (transaksi.pembayaran.length === 0) {
      await tx.pembayaran.create({
        data: {
          transaksiId: transaksi.id,
          metode: transaksi.metodeBayar,
          jumlah: transaksi.total,
          uangDiterima: null,
        },
      })
    }
  })

  const hasil = await muatHasilTransaksi(input.id)
  if (!hasil) throw new GalatDomain('Pesanan tidak ditemukan')
  return hasil
}

// Batalkan pesanan online yang belum dibayar. Stok dikembalikan hanya bila
// memang pernah dipotong (stokTerpotong), sehingga pembatalan tidak menambah
// stok yang tidak pernah keluar.
export async function batalkanPesananOnline(
  id: string,
  aktorId?: string | null,
): Promise<{ id: string; statusPesanan: 'DIBATALKAN' }> {
  const hasil = await prisma.$transaction(async (tx) => {
    const transaksi = await tx.transaksi.findUnique({
      where: { id },
      select: {
        id: true,
        nomor: true,
        sumber: true,
        dibayarPada: true,
        stokTerpotong: true,
        statusPesanan: true,
      },
    })
    if (!transaksi) throw new GalatDomain('Pesanan tidak ditemukan')
    if (transaksi.sumber !== 'ONLINE') {
      throw new GalatDomain('Pembatalan ini hanya untuk pesanan online')
    }
    if (transaksi.dibayarPada) {
      throw new GalatKonflik(
        'SUDAH_DIBAYAR',
        'Pesanan sudah dibayar; refund belum didukung',
      )
    }
    if (transaksi.statusPesanan === 'DIBATALKAN') {
      return { id, nomor: transaksi.nomor, baru: false }
    }
    if (transaksi.stokTerpotong) {
      await kembalikanStok(tx, await kebutuhanStokTransaksi(tx, id))
    }
    await tx.transaksi.update({
      where: { id },
      data: { statusPesanan: 'DIBATALKAN', stokTerpotong: false },
    })
    return { id, nomor: transaksi.nomor, baru: true }
  })

  if (hasil.baru) {
    void kirimAlertFraud({
      jenis: 'transaksi.dibatalkan',
      pesan: `Pesanan online ${hasil.nomor} dibatalkan sebelum dibayar`,
      aktorId,
      entitasId: hasil.id,
    })
  }
  return { id: hasil.id, statusPesanan: 'DIBATALKAN' as const }
}

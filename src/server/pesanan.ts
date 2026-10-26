import { prisma } from '#/db'

import { bacaTokenMeja } from './mejaToken.js'
import { postingTransaksi, ringkasHasil } from '#/server/transaksi'
import { PesananOnlineSchema } from '#/validations/transaksi'
import { cekTokoBuka } from './pengaturan.js'
import { GalatDomain } from './galat.js'

// ─── Data master untuk halaman pemesanan online (publik, tanpa login) ───

export async function pesananData(opsi?: { mejaToken?: string }) {
  const [produk, delivery] = await Promise.all([
    prisma.produk.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
      include: {
        kategori: true,
        produkModifierGrup: {
          include: {
            grup: {
              include: {
                modifiers: {
                  where: { aktif: true },
                  orderBy: { nama: 'asc' },
                },
              },
            },
          },
        },
      },
    }),
    prisma.delivery.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, tarif: true, estimasi: true },
    }),
  ])

  // Token QR hanya menandai meja asal; token rusak/kedaluwarsa tidak boleh
  // menggagalkan seluruh halaman menu. Daftar meja tidak lagi dikirim ke
  // publik — pelanggan tidak boleh memilih meja tanpa QR.
  let mejaDariToken: { id: string; nomor: string; nama: string | null } | null =
    null
  if (opsi?.mejaToken) {
    try {
      const { mejaId } = bacaTokenMeja(opsi.mejaToken)
      mejaDariToken = await prisma.meja.findFirst({
        where: { id: mejaId, aktif: true },
        select: { id: true, nomor: true, nama: true },
      })
    } catch {
      mejaDariToken = null
    }
  }

  return {
    produk: produk.map((p) => ({
      id: p.id,
      nama: p.nama,
      gambar: p.gambar,
      harga: p.harga.toNumber(),
      stok: p.stok,
      kategoriNama: p.kategori?.nama ?? null,
      modifierGrup: p.produkModifierGrup.map((pg) => ({
        id: pg.grup.id,
        nama: pg.grup.nama,
        wajib: pg.grup.wajib,
        min: pg.grup.min,
        max: pg.grup.max,
        modifiers: pg.grup.modifiers.map((m) => ({
          id: m.id,
          nama: m.nama,
          hargaTambahan: m.hargaTambahan.toNumber(),
          aktif: m.aktif,
        })),
      })),
    })),
    delivery: delivery.map((d) => ({
      id: d.id,
      nama: d.nama,
      tarif: d.tarif.toNumber(),
      estimasi: d.estimasi,
    })),
    mejaDariToken,
  }
}

// ─── Buat pesanan online dari pelanggan (publik) ───
// kasirId = null karena berasal dari pelanggan, bukan kasir.
// Hanya field aman yang diterima; diskon/pajak/poin/member dipaksa 0 dan
// status selalu MENUNGGU (SEC-02). Dine-in (meja/token QR), take away, atau
// antar (deliveryId; tarif ongkir selalu dari master Delivery di server).
export async function pesanTransaksi(
  input: unknown,
  opsi?: { memberId?: string },
) {
  // Cek apakah toko buka untuk pemesanan publik.
  const statusToko = await cekTokoBuka()
  if (!statusToko.buka) {
    throw new GalatDomain(statusToko.alasan ?? 'Toko tutup')
  }

  const data = PesananOnlineSchema.parse(input)
  // Dine-in publik hanya lewat QR bertanda tangan; tidak ada fallback mejaId.
  const mejaId = data.mejaToken
    ? bacaTokenMeja(data.mejaToken).mejaId
    : undefined
  const hasil = await postingTransaksi(
    {
      items: data.items,
      memberId: opsi?.memberId,
      mejaId,
      deliveryId: data.deliveryId,
      alamat: data.alamat,
      metodeBayar: data.metodeBayar,
      catatan: data.catatan,
      diskon: 0,
      pajak: 0,
      tukarPoin: 0,
      statusPesanan: 'MENUNGGU',
    },
    undefined,
    { sumber: 'ONLINE' },
  )
  return ringkasHasil(hasil)
}

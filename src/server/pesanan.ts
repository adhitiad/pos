import { prisma } from '#/db'

import { postingTransaksi, ringkasHasil } from '#/server/transaksi'
import { PesananOnlineSchema } from '#/validations/transaksi'

// ─── Data master untuk halaman pemesanan online (publik, tanpa login) ───

export async function pesananData() {
  const [produk, meja] = await Promise.all([
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
    prisma.meja.findMany({
      where: { aktif: true },
      orderBy: { nomor: 'asc' },
      select: { id: true, nomor: true, nama: true },
    }),
  ])

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
    meja: meja.map((m) => ({
      id: m.id,
      nomor: m.nomor,
      nama: m.nama,
    })),
  }
}

// ─── Buat pesanan online dari pelanggan (publik) ───
// kasirId = null karena berasal dari pelanggan, bukan kasir.
// Hanya field aman yang diterima; diskon/pajak/poin/member dipaksa 0 dan
// status selalu MENUNGGU (SEC-02). Ambil sendiri (take away) atau makan di
// tempat (meja); pengiriman tidak tersedia untuk pesanan online.
export async function pesanTransaksi(
  input: unknown,
  opsi?: { memberId?: string },
) {
  const data = PesananOnlineSchema.parse(input)
  const hasil = await postingTransaksi(
    {
      items: data.items,
      memberId: opsi?.memberId,
      mejaId: data.mejaId,
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

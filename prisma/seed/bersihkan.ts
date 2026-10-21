import { prisma } from './dasar.js'

// Bersihkan seluruh data agar seed bisa dijalankan ulang tanpa sisa data
// lama. Urutan delete mengikuti foreign key (anak lebih dulu).
//
// Catatan: tabel `user`, `session`, dan `account` TIDAK dihapus — akun login
// (OWNER/KASIR) beserta sesinya harus tetap hidup setelah seed.
export async function bersihkanSemua() {
  await prisma.auditLog.deleteMany()
  await prisma.deviceVisit.deleteMany()
  await prisma.pageVisit.deleteMany()
  await prisma.rateLimit.deleteMany()
  await prisma.nomorHarian.deleteMany()

  // Antrean cetak (FK → printer & transaksi).
  await prisma.printJob.deleteMany()
  // Pelunasan hutang supplier (FK → supplier & pembelian bahan).
  await prisma.pembayaranHutang.deleteMany()

  // Stok opname & retur (FK → user & transaksi).
  await prisma.stokOpnameItem.deleteMany()
  await prisma.stokOpname.deleteMany()
  await prisma.returItem.deleteMany()
  await prisma.retur.deleteMany()
  await prisma.shift.deleteMany()

  // Jurnal & transaksi.
  await prisma.jurnalDetail.deleteMany()
  await prisma.jurnal.deleteMany()
  await prisma.pembayaran.deleteMany()
  await prisma.transaksiItem.deleteMany()
  await prisma.transaksi.deleteMany()

  // Master produk & bahan.
  await prisma.produkBahan.deleteMany()
  await prisma.produkModifierGrup.deleteMany()
  await prisma.produk.deleteMany()
  await prisma.modifier.deleteMany()
  await prisma.modifierGrup.deleteMany()
  await prisma.kategori.deleteMany()
  await prisma.pembelianBahan.deleteMany()
  await prisma.bahan.deleteMany()

  // Master transaksi.
  await prisma.member.deleteMany()
  await prisma.delivery.deleteMany()
  await prisma.meja.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.printer.deleteMany()
  await prisma.akun.deleteMany()
  await prisma.pengaturan.deleteMany()
}

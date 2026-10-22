import { seedBahan } from './seed/bahan.js'
import { bersihkanSemua } from './seed/bersihkan.js'
import { prisma } from './seed/dasar.js'
import { seedMaster } from './seed/master.js'
import { seedOperasional } from './seed/operasional.js'
import { seedPengguna } from './seed/pengguna.js'
import { menuMakanan } from './seed/menu-makanan.js'
import { menuMinuman } from './seed/menu-minuman.js'
import {
  seedModifierProduk,
  seedProdukDasar,
  seedProdukMenu,
} from './seed/produk.js'
import { verifikasiSeed } from './seed/verifikasi.js'

// Seed database demo: master data, pengguna, bahan baku, produk + resep,
// modifier, printer, supplier, meja, akun buku besar, pengaturan, lalu data
// operasional (shift, transaksi, pembayaran, jurnal, retur, opname, cetak,
// audit, kunjungan).
//
// Dijalankan lewat `bun run db:seed`. Modul-modulnya dipisah agar tiap
// berkas tetap ringkas (lihat .agents/rules/04-batas-file.md).
async function main() {
  console.log('🌱 Seeding database...')

  await bersihkanSemua()

  const kategori = await seedMaster()
  const pengguna = await seedPengguna()
  const bahan = await seedBahan()

  await seedProdukDasar(kategori, bahan)
  // Kedua daftar menu digabung agar penomoran SKU/barcode berurutan & unik.
  await seedProdukMenu(kategori, [...menuMakanan(bahan), ...menuMinuman(bahan)])

  // Pasang grup modifier ke produk terpilih (uji mode F&B).
  await seedModifierProduk('Kopi Susu Gula Aren', 'Tingkat Manis')
  await seedModifierProduk('Kopi Susu Gula Aren', 'Ukuran')
  await seedModifierProduk('Corndog Mozza Coklat', 'Topping')

  await seedOperasional(pengguna)
  await verifikasiSeed()

  const jumlah = await prisma.produk.count()
  console.log(`✅ Seed selesai: ${jumlah} produk + data transaksi demo`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

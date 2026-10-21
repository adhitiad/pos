import { seedBahan } from './seed/bahan.js'
import { bersihkanSemua } from './seed/bersihkan.js'
import { prisma } from './seed/dasar.js'
import { seedMaster } from './seed/master.js'
import { menuMakanan } from './seed/menu-makanan.js'
import { menuMinuman } from './seed/menu-minuman.js'
import {
  seedModifierProduk,
  seedProdukDasar,
  seedProdukMenu,
} from './seed/produk.js'

// Seed database demo: master data, bahan baku, produk + resep, modifier,
// printer, supplier, meja, akun buku besar, dan pengaturan.
//
// Dijalankan lewat `bun run db:seed`. Modul-modulnya dipisah agar tiap
// berkas tetap ringkas (lihat .agents/rules/04-batas-file.md).
async function main() {
  console.log('🌱 Seeding database...')

  await bersihkanSemua()

  const kategori = await seedMaster()
  const bahan = await seedBahan()

  await seedProdukDasar(kategori, bahan)
  // Kedua daftar menu digabung agar penomoran SKU/barcode berurutan & unik.
  await seedProdukMenu(kategori, [...menuMakanan(bahan), ...menuMinuman(bahan)])

  // Pasang grup modifier ke produk terpilih (uji mode F&B).
  await seedModifierProduk('Kopi Susu Gula Aren', 'Tingkat Manis')
  await seedModifierProduk('Kopi Susu Gula Aren', 'Ukuran')
  await seedModifierProduk('Corndog Mozza Coklat', 'Topping')

  const jumlah = await prisma.produk.count()
  console.log(
    `✅ Seed selesai: ${jumlah} produk, bahan baku, member, kurir, meja, modifier, printer, supplier, akun, pengaturan`,
  )
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

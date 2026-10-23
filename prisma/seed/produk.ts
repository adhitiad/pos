import type { BahanPaket, MenuProduk } from './dasar.js'
import { prisma } from './dasar.js'

export interface KategoriPaket {
  makanan: string
  minuman: string
}

// Produk klasik (bukan dari menu HTML) — dibuat lebih dulu sebagai rujukan.
export async function seedProdukDasar(
  kategori: KategoriPaket,
  b: BahanPaket,
): Promise<void> {
  await prisma.produk.create({
    data: {
      nama: 'Kopi Susu Gula Aren',
      sku: 'MNM-001',
      barcode: '8991002100001',
      harga: 15000,
      stok: 100,
      kategoriId: kategori.minuman,
      resep: {
        create: [
          { bahanId: b.kopi, jumlah: 20 },
          { bahanId: b.susu, jumlah: 100 },
          { bahanId: b.gula, jumlah: 15 },
        ],
      },
    },
  })

  await prisma.produk.create({
    data: {
      nama: 'Espresso',
      sku: 'MNM-002',
      barcode: '8991002100002',
      harga: 10000,
      stok: 100,
      kategoriId: kategori.minuman,
      resep: { create: [{ bahanId: b.kopi, jumlah: 18 }] },
    },
  })

  await prisma.produk.create({
    data: {
      nama: 'Pisang Goreng',
      sku: 'MKN-001',
      barcode: '8991002100003',
      harga: 8000,
      stok: 50,
      kategoriId: kategori.makanan,
    },
  })
}

// Buat produk dari daftar menu (SKU & barcode otomatis, berurutan).
export async function seedProdukMenu(
  kategori: KategoriPaket,
  menu: MenuProduk[],
): Promise<void> {
  for (const [idx, p] of menu.entries()) {
    const urut = String(idx + 100).padStart(4, '0')
    await prisma.produk.create({
      data: {
        nama: p.nama,
        sku: `ML-${urut}`,
        barcode: `8991002100${urut}`,
        harga: p.harga,
        stok: 100,
        kategoriId:
          p.kategori === 'minuman' ? kategori.minuman : kategori.makanan,
        resep: p.bahan.length > 0 ? { create: p.bahan } : undefined,
      },
    })
  }
}

// Pasang grup modifier ke beberapa produk (untuk uji mode F&B / modifier).
export async function seedModifierProduk(
  namaProduk: string,
  namaGrup: string,
): Promise<void> {
  const produk = await prisma.produk.findFirst({
    where: { nama: namaProduk },
    select: { id: true },
  })
  const grup = await prisma.modifierGrup.findFirst({
    where: { nama: namaGrup },
    select: { id: true },
  })
  if (!produk) throw new Error(`Produk seed tidak ditemukan: ${namaProduk}`)
  if (!grup) throw new Error(`Grup modifier seed tidak ditemukan: ${namaGrup}`)
  await prisma.produkModifierGrup.create({
    data: { produkId: produk.id, grupId: grup.id },
  })
}

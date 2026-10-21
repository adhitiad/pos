import type { BahanPaket } from './dasar.js'
import { prisma } from './dasar.js'

interface BahanSeed {
  key: keyof BahanPaket
  nama: string
  satuan: string
  stok: number
  stokMinimum: number
  hargaSatuan: number
}

// Bahan baku utama + tambahan menu. `key` dipakai untuk merangkai resep menu.
const DAFTAR_BAHAN: BahanSeed[] = [
  {
    key: 'kopi',
    nama: 'Biji Kopi',
    satuan: 'gr',
    stok: 5000,
    stokMinimum: 500,
    hargaSatuan: 1.2,
  },
  {
    key: 'susu',
    nama: 'Susu UHT',
    satuan: 'ml',
    stok: 20000,
    stokMinimum: 2000,
    hargaSatuan: 0.02,
  },
  {
    key: 'gula',
    nama: 'Gula Aren',
    satuan: 'gr',
    stok: 10000,
    stokMinimum: 1000,
    hargaSatuan: 0.03,
  },
  {
    key: 'terigu',
    nama: 'Terigu',
    satuan: 'kg',
    stok: 100,
    stokMinimum: 10,
    hargaSatuan: 8000,
  },
  {
    key: 'telur',
    nama: 'Telur',
    satuan: 'pcs',
    stok: 200,
    stokMinimum: 20,
    hargaSatuan: 2500,
  },
  {
    key: 'minyak',
    nama: 'Minyak Goreng',
    satuan: 'ml',
    stok: 5000,
    stokMinimum: 500,
    hargaSatuan: 0.01,
  },
  {
    key: 'keju',
    nama: 'Keju Mozarella',
    satuan: 'gr',
    stok: 5000,
    stokMinimum: 500,
    hargaSatuan: 0.03,
  },
  {
    key: 'sosis',
    nama: 'Sosis',
    satuan: 'gr',
    stok: 3000,
    stokMinimum: 300,
    hargaSatuan: 0.02,
  },
  {
    key: 'kentang',
    nama: 'Kentang',
    satuan: 'gr',
    stok: 5000,
    stokMinimum: 500,
    hargaSatuan: 0.01,
  },
  {
    key: 'coklat',
    nama: 'Coklat',
    satuan: 'gr',
    stok: 1000,
    stokMinimum: 100,
    hargaSatuan: 0.1,
  },
  {
    key: 'vanila',
    nama: 'Essens Vanila',
    satuan: 'ml',
    stok: 500,
    stokMinimum: 50,
    hargaSatuan: 0.2,
  },
  {
    key: 'strober',
    nama: 'Saus Strawberry',
    satuan: 'gr',
    stok: 500,
    stokMinimum: 50,
    hargaSatuan: 0.15,
  },
  {
    key: 'kacang',
    nama: 'Kacang',
    satuan: 'gr',
    stok: 1000,
    stokMinimum: 100,
    hargaSatuan: 0.05,
  },
  {
    key: 'matcha',
    nama: 'Serbuk Matcha',
    satuan: 'gr',
    stok: 200,
    stokMinimum: 20,
    hargaSatuan: 0.5,
  },
  {
    key: 'tiramisu',
    nama: 'Serbuk Tiramisu',
    satuan: 'gr',
    stok: 200,
    stokMinimum: 20,
    hargaSatuan: 0.4,
  },
  {
    key: 'pistachio',
    nama: 'Pasta Pistachio',
    satuan: 'gr',
    stok: 200,
    stokMinimum: 20,
    hargaSatuan: 0.3,
  },
  {
    key: 'kopiHitam',
    nama: 'Kopi Hitam',
    satuan: 'ml',
    stok: 5000,
    stokMinimum: 500,
    hargaSatuan: 0.05,
  },
  {
    key: 'gulaPasir',
    nama: 'Gula Pasir',
    satuan: 'gr',
    stok: 5000,
    stokMinimum: 500,
    hargaSatuan: 0.008,
  },
  {
    key: 'soda',
    nama: 'Soda',
    satuan: 'ml',
    stok: 5000,
    stokMinimum: 500,
    hargaSatuan: 0.01,
  },
  {
    key: 'melon',
    nama: 'Sirup Melon',
    satuan: 'ml',
    stok: 500,
    stokMinimum: 50,
    hargaSatuan: 0.1,
  },
  {
    key: 'jeruk',
    nama: 'Jus Jeruk',
    satuan: 'ml',
    stok: 500,
    stokMinimum: 50,
    hargaSatuan: 0.05,
  },
  {
    key: 'fanta',
    nama: 'Fanta',
    satuan: 'ml',
    stok: 500,
    stokMinimum: 50,
    hargaSatuan: 0.02,
  },
  {
    key: 'kelapa',
    nama: 'Kelapa Parut',
    satuan: 'gr',
    stok: 2000,
    stokMinimum: 200,
    hargaSatuan: 0.01,
  },
  {
    key: 'susuKental',
    nama: 'Susu Kental',
    satuan: 'gr',
    stok: 2000,
    stokMinimum: 200,
    hargaSatuan: 0.01,
  },
]

// Buat seluruh bahan baku & kembalikan peta id untuk penyusunan resep.
export async function seedBahan(): Promise<BahanPaket> {
  const paket = {} as BahanPaket
  for (const b of DAFTAR_BAHAN) {
    const dibuat = await prisma.bahan.create({
      data: {
        nama: b.nama,
        satuan: b.satuan,
        stok: b.stok,
        stokMinimum: b.stokMinimum,
        hargaSatuan: b.hargaSatuan,
      },
    })
    paket[b.key] = dibuat.id
  }
  return paket
}

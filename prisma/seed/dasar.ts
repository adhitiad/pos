import { PrismaClient } from '../../src/generated/prisma/client.js'

import { getDatabaseUrlCli } from '../../src/database-url.js'

import { PrismaPg } from '@prisma/adapter-pg'

// Klien Prisma khusus seed: koneksi langsung (Neon: tanpa "-pooler") + timeout
// longgar agar tahan cold start serverless.
const adapter = new PrismaPg({
  connectionString: getDatabaseUrlCli(),
  connectionTimeoutMillis: 20_000,
})

export const prisma = new PrismaClient({ adapter })

/** Id bahan yang dipakai untuk menyusun resep menu. */
export interface BahanPaket {
  kopi: string
  susu: string
  gula: string
  terigu: string
  telur: string
  minyak: string
  keju: string
  sosis: string
  kentang: string
  coklat: string
  vanila: string
  strober: string
  kacang: string
  matcha: string
  tiramisu: string
  pistachio: string
  kopiHitam: string
  gulaPasir: string
  soda: string
  melon: string
  jeruk: string
  fanta: string
  kelapa: string
  susuKental: string
}

/** Satu item menu beserta resep bahannya. */
export interface MenuProduk {
  nama: string
  harga: number
  /** Kategori implisit: 'makanan' atau 'minuman'. */
  kategori: 'makanan' | 'minuman'
  bahan: { bahanId: string; jumlah: number }[]
}

/** Parser harga format "21.334" → 21334 (harga daftar dalam ribuan). */
export const parseHarga = (s: string): number =>
  parseInt(s.replace(/\./g, ''), 10)

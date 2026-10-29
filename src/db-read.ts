import { PrismaClient } from './generated/prisma/client.js'

import { getDatabaseUrlRead } from './database-url.js'
import { env } from './env.js'

import { PrismaPg } from '@prisma/adapter-pg'

// Klien Prisma terpisah untuk query baca (laporan, dasbor, katalog).
// Saat DATABASE_URL_READ diisi (read replica / follower), query arahkan ke sana
// agar beban tulis utama tidak terganggu. Bila kosong, fallback ke DATABASE_URL
// sehingga perilaku sama seperti satu database tunggal.
const adapter = new PrismaPg({
  connectionString: getDatabaseUrlRead(),
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  query_timeout: env.DB_STATEMENT_TIMEOUT_MS + 5_000,
})

declare global {
  var __prismaBaca: PrismaClient | undefined
}

export const prismaBaca =
  globalThis.__prismaBaca || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaBaca = prismaBaca
}

if (process.env.NODE_ENV === 'production') {
  let sedangTutup = false
  const tutup = async () => {
    if (sedangTutup) return
    sedangTutup = true
    try {
      await prismaBaca.$disconnect()
    } finally {
      process.exit(0)
    }
  }
  process.once('SIGTERM', () => void tutup())
  process.once('SIGINT', () => void tutup())
}

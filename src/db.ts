import { PrismaClient } from './generated/prisma/client.js'

import { getDatabaseUrl } from './database-url.js'
import { env } from './env.js'

import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  // statement_timeout membatasi query di server; query_timeout menjaga sisi
  // klien tetap berhenti bila koneksi menggantung.
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  query_timeout: env.DB_STATEMENT_TIMEOUT_MS + 5_000,
})

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Tutup pool saat proses dihentikan agar koneksi Neon tidak menggantung dan
// deploy berikutnya tidak kehabisan koneksi.
if (process.env.NODE_ENV === 'production') {
  let sedangTutup = false
  const tutup = async () => {
    if (sedangTutup) return
    sedangTutup = true
    try {
      await prisma.$disconnect()
    } finally {
      process.exit(0)
    }
  }
  process.once('SIGTERM', () => void tutup())
  process.once('SIGINT', () => void tutup())
}

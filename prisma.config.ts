import { defineConfig } from 'prisma/config'

import { normalisasiSslMode } from './src/ssl'

// CLI Prisma (db push / migrate / seed) memakai koneksi langsung bila ada
// (Neon: DATABASE_URL_UNPOOLED), agar DDL tidak lewat PgBouncer.
// sslmode dinormalisasi ke 'verify-full' → tanpa peringatan driver pg.
const databaseUrl = normalisasiSslMode(
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '',
)

const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL
  ? normalisasiSslMode(process.env.SHADOW_DATABASE_URL)
  : undefined

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
    shadowDatabaseUrl,
  },
})

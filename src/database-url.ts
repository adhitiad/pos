import { env } from './env'
import { normalisasiSslMode } from './ssl'

// Runtime aplikasi. Boleh memakai endpoint pooled (PgBouncer) untuk serverless.
export function getDatabaseUrl() {
  return normalisasiSslMode(env.DATABASE_URL)
}

// Operasi CLI Prisma (db push / migrate / seed): pakai koneksi LANGSUNG bila
// tersedia (Neon: host tanpa akhiran "-pooler") karena DDL & prepared statement
// di PgBouncer bisa gagal. Fallback ke DATABASE_URL bila tak diisi.
export function getDatabaseUrlCli() {
  return normalisasiSslMode(env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL)
}

// URL baca (read replica). Bila DATABASE_URL_READ tidak diisi, fallback ke
// DATABASE_URL agar aplikasi tetap berjalan dengan satu database tunggal.
export function getDatabaseUrlRead() {
  return normalisasiSslMode(env.DATABASE_URL_READ ?? env.DATABASE_URL)
}

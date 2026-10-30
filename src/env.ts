import { config } from 'dotenv'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

config({ path: '.env.local' })

// Vercel selalu berada di belakang proxy-nya dan menulis ulang
// X-Forwarded-For. Bila TRUST_PROXY tidak diset, aktifkan otomatis di Vercel
// agar rate limit auth membaca IP klien, bukan satu bucket global
// "no-trusted-ip". Set TRUST_PROXY=false untuk mematikan eksplisit.
const trustProxyDefault = process.env.VERCEL === '1'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    // URL koneksi baca terpisah (read replica siap pakai). Bila kosong, fallback
    // ke DATABASE_URL sehingga perilaku sama seperti satu DB.
    DATABASE_URL_READ: z.string().url().optional(),
    // URL koneksi langsung (non-pooler) untuk operasi CLI Prisma
    // (db push/migrate/seed). Di Neon ini host tanpa akhiran "-pooler".
    DATABASE_URL_UNPOOLED: z.string().url().optional(),
    // Batas pool & timeout query runtime. Default aman untuk serverless/Neon.
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(30_000),
    DB_CONNECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .default(10_000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(15_000),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32, 'Secret minimal 32 karakter'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // Client ID OAuth native (iOS/Android). Harus berbeda dari client web;
    // kosong = endpoint /api/v1/auth-native menolak login native.
    GOOGLE_NATIVE_CLIENT_ID: z.string().optional(),
    OWNER_EMAILS: z.string().optional(),
    KASIR_EMAILS: z.string().optional(),
    TRUSTED_ORIGINS: z.string().optional(),
    // Percayai header X-Forwarded-For/X-Real-IP (hanya bila di belakang proxy tepercaya).
    TRUST_PROXY: z
      .string()
      .optional()
      .transform((v) =>
        v === undefined ? trustProxyDefault : v === 'true' || v === '1',
      ),
    // Jumlah proxy tepercaya yang MENAMBAHKAN entri X-Forwarded-For.
    // XFF dibaca dari kanan; Vercel = 1 hop. Naikkan bila ada proxy tambahan.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(10).default(1),
    // Flag eksplisit CSP: `true`/`1` menyalakan, `false`/`0` mematikan;
    // kosong = default (menyala saat produksi).
    ENABLE_CSP: z
      .string()
      .optional()
      .transform((v) =>
        v === undefined ? undefined : v === 'true' || v === '1',
      ),
    // Level log pino (trace|debug|info|warn|error|fatal). Default: debug di dev,
    // info di produksi.
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .optional(),
    // Cloudinary (hanya server). Signature upload dibuat server; API secret
    // TIDAK pernah dikirim ke klien.
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    // Folder Cloudinary khusus aset POS (untuk validasi hapus/unduh yang aman).
    CLOUDINARY_FOLDER: z.string().min(1).optional(),
    // Secret HMAC untuk webhook pembayaran (payment gateway mendatang).
    // Kosong = endpoint webhook menolak semua permintaan.
    PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional(),
    // Secret untuk route cron (/api/cron/*). Vercel mengirim header
    // Authorization: Bearer <CRON_SECRET>. Kosong = cron menolak semua.
    CRON_SECRET: z.string().min(16).optional(),

    // GlitchTip (Sentry-compatible) DSN untuk error tracking produksi.
    // Kosong = error tracking tidak aktif, hanya log pino lokal.
    GLITCHTIP_DSN: z.string().url().optional(),

    // Webhook opsional untuk alert fraud (pembatalan, retur, perubahan
    // pengaturan sensitif). Kosong = alert hanya masuk log pino level warn.
    FRAUD_WEBHOOK_URL: z.string().url().optional(),

    // Kredensial uji restore backup (hanya untuk skrip sekali-pakai di Temp).
    // Tidak pernah digunakan oleh runtime aplikasi.
    BACKUP_RESTORE_USER: z.string().min(1).optional(),
    BACKUP_RESTORE_PASS: z.string().min(1).optional(),

    // ── Upstash Redis (rate limiting login/logout, caching search) ──
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // ── QStash (cron scheduling & background tasks) ──
    QSTASH_URL: z.string().url().default('https://qstash-upstash-com'),
    QSTASH_TOKEN: z.string().min(1).optional(),
    QSTASH_CURRENT_ENV: z.string().optional(),
    QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
    QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
  },

  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
  },

  runtimeEnv: {
    ...import.meta.env,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_READ: process.env.DATABASE_URL_READ,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    DB_POOL_MAX: process.env.DB_POOL_MAX,
    DB_IDLE_TIMEOUT_MS: process.env.DB_IDLE_TIMEOUT_MS,
    DB_CONNECTION_TIMEOUT_MS: process.env.DB_CONNECTION_TIMEOUT_MS,
    DB_STATEMENT_TIMEOUT_MS: process.env.DB_STATEMENT_TIMEOUT_MS,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_NATIVE_CLIENT_ID: process.env.GOOGLE_NATIVE_CLIENT_ID,
    OWNER_EMAILS: process.env.OWNER_EMAILS,
    KASIR_EMAILS: process.env.KASIR_EMAILS,
    TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
    TRUST_PROXY: process.env.TRUST_PROXY,
    TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS,
    ENABLE_CSP: process.env.ENABLE_CSP,
    LOG_LEVEL: process.env.LOG_LEVEL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER,
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    GLITCHTIP_DSN: process.env.GLITCHTIP_DSN,
    FRAUD_WEBHOOK_URL: process.env.FRAUD_WEBHOOK_URL,
    BACKUP_RESTORE_USER: process.env.BACKUP_RESTORE_USER,
    BACKUP_RESTORE_PASS: process.env.BACKUP_RESTORE_PASS,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    QSTASH_URL: process.env.QSTASH_URL,
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_CURRENT_ENV: process.env.QSTASH_CURRENT_ENV,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
  },

  emptyStringAsUndefined: true,
})

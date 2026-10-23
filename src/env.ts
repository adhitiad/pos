import { config } from 'dotenv'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

config({ path: '.env.local' })

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    // URL koneksi langsung (non-pooler) untuk operasi CLI Prisma
    // (db push/migrate/seed). Di Neon ini host tanpa akhiran "-pooler".
    DATABASE_URL_UNPOOLED: z.string().url().optional(),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32, 'Secret minimal 32 karakter'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    OWNER_EMAILS: z.string().optional(),
    KASIR_EMAILS: z.string().optional(),
    TRUSTED_ORIGINS: z.string().optional(),
    // Percayai header X-Forwarded-For/X-Real-IP (hanya bila di belakang proxy tepercaya).
    TRUST_PROXY: z
      .string()
      .optional()
      .transform((v) => v === 'true' || v === '1'),
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
  },

  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
  },

  runtimeEnv: {
    ...import.meta.env,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
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
  },

  emptyStringAsUndefined: true,
})

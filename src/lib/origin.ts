import { env } from '../env.js'

// Origin yang diizinkan: origin sendiri + daftar TRUSTED_ORIGINS (koma).
// Dipakai Better Auth (trustedOrigins) dan pemeriksaan Origin REST (OW-14).
//
// Saat dev, origin lokal Expo & e2e otomatis diizinkan supaya tak perlu
// terus menambah TRUSTED_ORIGINS di tiap mesin:
const ORIGIN_LOKAL_DEV = [
  'http://localhost:3000', // dev web POS
  'http://localhost:3100', // dev e2e (playwright)
  'http://localhost:8081', // Expo dev (native & web)
  'http://localhost:19006', // Expo web dev
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8081',
]

export const ORIGIN_TEPERCAYA: ReadonlyArray<string> = [
  ...new Set([
    new URL(env.BETTER_AUTH_URL).origin,
    ...(env.TRUSTED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    ...(process.env.NODE_ENV === 'production' ? [] : ORIGIN_LOKAL_DEV),
  ]),
]

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { bearer } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { prisma } from '#/db'
import { env } from '#/env'
import {
  nativeIdTokenGuard,
  sembunyikanTokenSesi,
} from '#/lib/auth-native-guard'
import { logger } from '#/lib/logger'
import { ORIGIN_TEPERCAYA } from '#/lib/origin'
import { peranDariEmail as peranDariEnv } from '#/lib/peran-email'
import { klienNativeId } from '#/server/auth-native'
import { batasi } from '#/server/rateLimit'

// Peran dari daftar env: email di OWNER_EMAILS → OWNER, di KASIR_EMAILS → KASIR.
// Satu sumber kebenaran untuk pembuatan akun & sinkronisasi saat login.
function peranDariEmail(email: string): 'OWNER' | 'KASIR' | null {
  return peranDariEnv(email, {
    owner: env.OWNER_EMAILS,
    kasir: env.KASIR_EMAILS,
  })
}

// Akun yang dibuat sebelum OWNER_EMAILS/KASIR_EMAILS diisi akan tersimpan
// sebagai MEMBER selamanya (hook create hanya jalan sekali). Setiap kali
// sign-in, perannya disinkronkan ulang — KECUALI akun yang perannya sudah
// diubah manual dari halaman /user (roleManual), karena pilihan owner manual
// lebih tinggi prioritasnya daripada daftar env.
export async function sinkronPeranUser(
  userId: string,
  daftar: { owner?: string | undefined; kasir?: string | undefined } = {
    owner: env.OWNER_EMAILS,
    kasir: env.KASIR_EMAILS,
  },
  kecualiSesiId?: string,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, roleManual: true },
    })
    if (!user) return
    if (user.roleManual) return
    const target = peranDariEnv(user.email, daftar)
    if (!target || target === user.role) return
    // Sesi lama tidak boleh mewarisi peran baru. Sesi yang baru dibuat
    // dikecualikan agar login yang sedang berjalan tidak ikut terhapus.
    const sesiDicabut = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role: target } })
      const hasil = await tx.session.deleteMany({
        where: {
          userId,
          ...(kecualiSesiId ? { id: { not: kecualiSesiId } } : {}),
        },
      })
      return hasil.count
    })
    logger.info({
      kind: 'audit',
      event: 'user.role.synced',
      role: target,
      oldRole: user.role,
      sesiDicabut,
    })
  } catch {
    // Sinkronisasi peran tak boleh menggagalkan login.
  }
}

const googleClientIds = [env.GOOGLE_CLIENT_ID, klienNativeId()].filter(
  (id): id is string => Boolean(id),
)

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  // Email/password dimatikan: login hanya lewat Google, tanpa permukaan kredensial.
  emailAndPassword: { enabled: false },
  rateLimit: {
    enabled: true,
    window: 10,
    max: 50,
    // Storage default Better Auth adalah memory per-proses: di serverless,
    // setiap instance punya hitungan sendiri sehingga brute force tetap lolos.
    // Pakai token bucket Postgres yang sama dengan endpoint lain agar kuota
    // berlaku lintas instance (tanpa Redis tambahan).
    customStorage: {
      consume: async (key, rule) => {
        const hasil = await batasi(`auth:${key}`, rule.max, rule.window * 1_000)
        return {
          allowed: hasil.boleh,
          retryAfter: hasil.boleh ? null : hasil.retryAfter,
        }
      },
    },
    // Path Better Auth sudah tanpa prefix /api/auth. `*` cocok untuk sub-path
    // (mis. /sign-in/social, /callback/google); entri tanpa `*` menjaga
    // kompatibilitas bila path persis dipakai.
    customRules: {
      '/sign-in': { window: 60, max: 5 },
      '/sign-in/*': { window: 60, max: 5 },
      '/sign-up': { window: 60, max: 3 },
      '/sign-up/*': { window: 60, max: 3 },
      '/callback': { window: 60, max: 20 },
      '/callback/*': { window: 60, max: 20 },
    },
  },
  // Origin tepercaya selalu terdefinisi: origin sendiri + daftar dari env.
  trustedOrigins: [...ORIGIN_TEPERCAYA],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    // `useSecureCookies` sudah mengatur atribut `Secure`; jangan dobel.
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax',
      httpOnly: true,
    },
    ipAddress: env.TRUST_PROXY
      ? { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] }
      : { disableIpTracking: true },
  },
  socialProviders: {
    google: {
      // Array audiens: web (utama) + native. Token native diverifikasi Better
      // Auth terhadap daftar ini, lalu endpoint native memastikan aud-nya
      // memang client native (bukan client web).
      clientId:
        googleClientIds.length > 1
          ? googleClientIds
          : (googleClientIds[0] ?? ''),
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const peran = peranDariEmail(user.email) ?? 'MEMBER'
          // Log audit tanpa PII: email tidak pernah ditulis (OW-17).
          if (process.env.NODE_ENV !== 'development') {
            logger.info({ kind: 'audit', event: 'user.created', role: peran })
          }
          return { data: { ...user, role: peran } }
        },
      },
      update: {
        after: async ({ data, oldData }) => {
          // Hanya transisi peran yang dicatat; id user (pseudonim) tidak ditulis.
          if (process.env.NODE_ENV !== 'development') {
            const d = data as { role: string }
            const od = oldData as { role?: string } | undefined
            logger.info({
              kind: 'audit',
              event: 'user.updated',
              role: d.role,
              oldRole: od?.role,
            })
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          // Peran mengikuti OWNER_EMAILS/KASIR_EMAILS tiap kali sign-in:
          // akun lama yang dibuat sebelum env diisi bisa naik ke OWNER/KASIR
          // (OWNER tidak pernah diturunkan otomatis).
          await sinkronPeranUser(
            session.userId,
            {
              owner: env.OWNER_EMAILS,
              kasir: env.KASIR_EMAILS,
            },
            session.id,
          )
          // Tanpa id sesi/user: cegah PII/pseudonim bocor ke log (OW-17).
          if (process.env.NODE_ENV !== 'development') {
            logger.info({ kind: 'audit', event: 'session.created' })
          }
        },
      },
      delete: {
        after: async () => {
          if (process.env.NODE_ENV !== 'development') {
            logger.info({ kind: 'audit', event: 'session.deleted' })
          }
        },
      },
    },
  },
  // `bearer` → klien native (Expo/React Native) tidak punya cookie jar, jadi
  // sesi dikirim sebagai header `Authorization: Bearer <token>` (token dari
  // POST /api/v1/auth-social). Tanpa plugin ini, getSession hanya membaca
  // cookie bertanda tangan sehingga token mobile tidak dikenali.
  // `tanstackStartCookies` tetap dipakai web (cookie httpOnly).
  plugins: [
    bearer(),
    nativeIdTokenGuard,
    sembunyikanTokenSesi,
    tanstackStartCookies(),
  ],
})

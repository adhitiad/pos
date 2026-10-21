import { getRequestIP } from '@tanstack/react-start/server'

import { prisma } from '#/db'
import { env } from '#/env'
import { GalatRateLimit } from './galat.js'
import type { HasilBatasi } from '#/types/rate-limit'

const JENDELA_MS = 10_000

// Rate limit bersama berbasis Postgres: atomik dan berlaku lintas instance
// server (bukan in-memory per-proses). Baris lama disapu sesekali.
let hitunganSapu = 0

export async function batasi(
  kunci: string,
  max = 30,
  windowMs = JENDELA_MS,
): Promise<HasilBatasi> {
  const detik = String(Math.max(1, Math.ceil(windowMs / 1000)))
  const rows = await prisma.$queryRaw<{ hit: number; resetAt: Date }[]>`
    INSERT INTO rate_limit ("key", "hit", "resetAt")
    VALUES (${kunci}, 1, now() + make_interval(secs => ${detik}::double precision))
    ON CONFLICT ("key") DO UPDATE SET
      "hit" = CASE
        WHEN rate_limit."resetAt" <= now() THEN 1
        ELSE rate_limit."hit" + 1
      END,
      "resetAt" = CASE
        WHEN rate_limit."resetAt" <= now()
          THEN now() + make_interval(secs => ${detik}::double precision)
        ELSE rate_limit."resetAt"
      END
    RETURNING "hit", "resetAt"
  `
  hitunganSapu += 1
  if (hitunganSapu % 200 === 0) {
    await prisma.rateLimit.deleteMany({
      where: { resetAt: { lt: new Date(Date.now() - 3_600_000) } },
    })
  }
  const row = rows[0]
  if (row.hit > max) {
    const sisaMs = row.resetAt.getTime() - Date.now()
    return { boleh: false, retryAfter: Math.max(1, Math.ceil(sisaMs / 1000)) }
  }
  return { boleh: true, retryAfter: 0 }
}

// IP klien tepercaya: header proxy hanya dipakai bila TRUST_PROXY aktif,
// selain itu pakai alamat soket dari event server (tak bisa dipalsukan klien).
export function ipSaatIni(): string {
  try {
    return getRequestIP({ xForwardedFor: env.TRUST_PROXY }) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

// Pembungkus untuk route REST: kembalikan Response 429 bila melebihi batas.
export async function rateLimit(
  request: Request,
  max = 30,
  windowMs = JENDELA_MS,
): Promise<Response | null> {
  const kunci = `${new URL(request.url).pathname}:${ipSaatIni()}`
  const hasil = await batasi(kunci, max, windowMs)
  if (hasil.boleh) return null
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Terlalu banyak permintaan',
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(hasil.retryAfter),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

// Pembungkus untuk server function: lempar GalatRateLimit (dipetakan ke 429).
export async function batasiNama(
  nama: string,
  max = 30,
  windowMs = JENDELA_MS,
): Promise<void> {
  const hasil = await batasi(`${nama}:${ipSaatIni()}`, max, windowMs)
  if (!hasil.boleh) throw new GalatRateLimit()
}

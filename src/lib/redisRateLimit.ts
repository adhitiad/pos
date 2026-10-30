import { Ratelimit } from '@upstash/ratelimit'

import { redis } from '#/lib/upstash'
import type { HasilBatasi } from '#/types/rate-limit'

// Redis rate limiter: fixed-window via @upstash/ratelimit.
// Digunakan sebagai pengganti PostgreSQL token bucket ketika Redis tersedia,
// terutama untuk proteksi brute-force login/logout (Better Auth).

const limiterCache: Map<string, Ratelimit> = new Map()

function buatLimiter(kunci: string, max: number, windowSec: number): Ratelimit {
  const cached = limiterCache.get(kunci)
  if (cached) return cached
  const baru = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.fixedWindow(max, `${windowSec}s` as never),
    prefix: `rl:${kunci}`,
  })
  limiterCache.set(kunci, baru)
  return baru
}

// Hitung retry-after detik dari Unix timestamp reset.
function hitungRetryAfter(resetMs: number): number {
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1_000))
}

export async function batasiRedis(
  kunci: string,
  max: number,
  windowMs: number,
): Promise<HasilBatasi> {
  if (!redis) {
    // Fallback ke Postgres bila Redis tidak terkonfigurasi.
    const { batasi } = await import('#/server/rateLimit')
    return batasi(kunci, max, windowMs)
  }

  const windowSec = Math.max(1, Math.floor(windowMs / 1_000))
  const limiter = buatLimiter(kunci, max, windowSec)
  const hasil = await limiter.limit(kunci)

  if (!hasil.success) {
    return {
      boleh: false,
      retryAfter: hitungRetryAfter(hasil.reset),
    }
  }

  return { boleh: true, retryAfter: 0 }
}

// Better Auth rateLimit.customStorage adapter (Redis).
// Interface: { consume: (key, rule) => { allowed, retryAfter } }
export function redisRateLimitStorage() {
  return {
    consume: async (
      key: string,
      rule: { max: number; window: number },
    ): Promise<{ allowed: boolean; retryAfter: number | null }> => {
      const hasil = await batasiRedis(key, rule.max, rule.window * 1_000)
      return {
        allowed: hasil.boleh,
        retryAfter: hasil.boleh ? null : hasil.retryAfter,
      }
    },
  }
}

// Convenience: cek apakah Redis tersedia (untuk kondisional rate limiter).
export { redisTersedia } from '#/lib/upstash'

import { Redis } from '@upstash/redis'
import { Client as QstashClient } from '@upstash/qstash'

import { env } from '#/env'

// Singleton Upstash Redis — dipakai untuk rate limiting (login/logout),
// caching search, dan session storage.
export const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

// Singleton QStash — dipakai untuk penjadwalan cron & background tasks.
export const qstash = env.QSTASH_TOKEN
  ? new QstashClient({
      token: env.QSTASH_TOKEN,
      baseUrl: env.QSTASH_URL,
    })
  : null

// Convenience: cek apakah Upstash Redis tersedia.
export function redisTersedia(): boolean {
  return redis !== null
}

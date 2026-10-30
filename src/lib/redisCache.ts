import { redis } from '#/lib/upstash'
import { logger } from '#/lib/logger'

// Prefix kunci Redis — semua kunci cache diawali prefix ini untuk mudah
// invalidasi masal (FLUSH berdasarkan prefix).
const PREFIX = 'cache:pos:'

// TTL cache (detik) untuk data yang relatif statis.
const TTL_CACHE = 300 // 5 menit — landing page produk
const TTL_SEARCH = 60 // 1 menit — hasil pencarian produk

export function redisCacheKey(kunci: string): string {
  return `${PREFIX}${kunci}`
}

// Ambil cache dari Redis (JSON). Kembalikan null bila tidak ada / Redis off.
export async function cacheGet<T>(kunci: string): Promise<T | null> {
  if (!redis) return null
  try {
    const mentah = await redis.get<string>(redisCacheKey(kunci))
    if (!mentah) return null
    return JSON.parse(mentah) as T
  } catch (e) {
    logger.debug({ kind: 'redis', event: 'cache.miss', error: String(e) })
    return null
  }
}

// Simpan ke Redis dengan TTL.
export async function cacheSet(
  kunci: string,
  nilai: unknown,
  ttlDetik = TTL_CACHE,
): Promise<void> {
  if (!redis) return
  try {
    await redis.set(redisCacheKey(kunci), JSON.stringify(nilai), {
      ex: ttlDetik,
    })
  } catch (e) {
    logger.debug({
      kind: 'redis',
      event: 'cache.write.error',
      error: String(e),
    })
  }
}

// Invalidate (hapus) satu atau banyak kunci cache.
export async function cacheHapus(...kunci: string[]): Promise<void> {
  if (!redis) return
  try {
    await redis.del(...kunci.map((k) => redisCacheKey(k)))
  } catch (e) {
    logger.debug({
      kind: 'redis',
      event: 'cache.invalidate.error',
      error: String(e),
    })
  }
}

// Invalidate semua kunci cache dengan pola prefix tertentu.
export async function cacheHapusPola(prefix: string): Promise<void> {
  if (!redis) return
  try {
    const keys = await redis.keys(`${PREFIX}${prefix}*`)
    if (keys.length > 0) await redis.del(...keys)
  } catch (e) {
    logger.debug({
      kind: 'redis',
      event: 'cache.invalidate.pattern.error',
      error: String(e),
    })
  }
}

export { TTL_CACHE, TTL_SEARCH }

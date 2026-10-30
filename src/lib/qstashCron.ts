import { env } from '#/env'
import { qstash } from '#/lib/upstash'
import { logger } from '#/lib/logger'

// QStash cron scheduling: menggantikan (atau melengkapi) Vercel Crons untuk
// task yang butuh retry otomatis dan dead-letter queue.

// Verifikasi signature QStash pada request yang masuk ke endpoint cron.
// QStash mengirim Authorization: Bearer <QSTASH_TOKEN>.
export function permintaanQstashSah(request: Request): boolean {
  if (!env.QSTASH_TOKEN) return false
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return false
  return token === env.QSTASH_TOKEN
}

// Interface untuk verifikasi gabungan: Vercel cron token ATAU QStash token.
export function tokenCronSahQstash(request: Request): boolean {
  // Vercel cron: Authorization: Bearer <CRON_SECRET>
  if (env.CRON_SECRET) {
    const header = request.headers.get('authorization')
    const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
    if (token === env.CRON_SECRET) return true
  }
  // QStash: Authorization: Bearer <QSTASH_TOKEN>
  return permintaanQstashSah(request)
}

// Jadwalkan cron job via QStash. Hanya berjalan bila QStash terkonfigurasi.
// `schedule` = cron expression (mis. "0 */6 * * *" = tiap 6 jam).
// `url` = endpoint yang akan dipanggil oleh QStash.
export async function jadwalkanCronQstash(
  schedule: string,
  url: string,
  body?: Record<string, unknown>,
): Promise<string | null> {
  if (!qstash) {
    logger.warn({
      kind: 'qstash',
      msg: 'QStash tidak terkonfigurasi, cron tidak dijadwalkan',
    })
    return null
  }

  try {
    const hasil = await qstash.schedules.create({
      cron: schedule,
      destination: url,
      method: 'GET',
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    logger.info({ kind: 'qstash', event: 'schedule.created', schedule, url })
    return typeof hasil === 'string' ? hasil : hasil.scheduleId
  } catch (e) {
    logger.error({ kind: 'qstash', event: 'schedule.error', error: String(e) })
    return null
  }
}

// Publish pesan ke background worker via QStash (untuk tugas asinkron
// yang tidak perlu diblokir request-response).
export async function kirimQstash(
  url: string,
  body?: Record<string, unknown>,
  delaySec?: number,
): Promise<boolean> {
  if (!qstash) return false
  try {
    await qstash.publishJSON({
      url,
      method: 'POST',
      body: body ?? {},
      ...(delaySec ? { delay: delaySec } : {}),
    })
    return true
  } catch (e) {
    logger.error({ kind: 'qstash', event: 'publish.error', error: String(e) })
    return false
  }
}

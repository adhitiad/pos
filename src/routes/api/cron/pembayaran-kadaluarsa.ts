import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { apiError, gagal, ok } from '#/server/api'
import { tokenCronSahQstash } from '#/lib/qstashCron'
import { cekPembayaranKadaluarsa } from '#/server/pembayaranKadaluarsa'
import { rateLimit } from '#/server/rateLimit'

// Cron: batalkan transaksi online yang belum dibayar >45 menit.
// Didukung 2 scheduler: Vercel Crons (Bearer CRON_SECRET) atau QStash
// (Bearer QSTASH_TOKEN). Salah satu harus dikonfigurasi agar cron aktif.
export const Route = createFileRoute('/api/cron/pembayaran-kadaluarsa')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const batas = await rateLimit(request, 10)
        if (batas) return batas
        if (!env.CRON_SECRET && !env.QSTASH_TOKEN) {
          return gagal(
            'CRON_DISABLED',
            'Cron belum dikonfigurasi di server',
            503,
          )
        }
        if (!tokenCronSahQstash(request))
          return gagal('UNAUTHORIZED', 'Token cron tidak valid', 401)
        try {
          return ok(await cekPembayaranKadaluarsa())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

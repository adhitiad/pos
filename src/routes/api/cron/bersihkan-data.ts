import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { apiError, gagal, ok } from '#/server/api'
import { tokenCronSahQstash } from '#/lib/qstashCron'
import { bersihkanDataKadaluarsa } from '#/server/bersihkanData'
import { rateLimit } from '#/server/rateLimit'

// Cron: hapus print job & draft transaksi yang kadaluwarsa (>30 hari)
// untuk higiene penyimpanan.
// Didukung 2 scheduler: Vercel Crons (Bearer CRON_SECRET) atau QStash
// (Bearer QSTASH_TOKEN). Salah satu harus dikonfigurasi agar cron aktif.
export const Route = createFileRoute('/api/cron/bersihkan-data')({
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
          return ok(await bersihkanDataKadaluarsa())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { apiError, gagal, ok } from '#/server/api'
import { tokenCronSah } from '#/server/cronAuth'
import { bersihkanDataKadaluarsa } from '#/server/bersihkanData'
import { rateLimit } from '#/server/rateLimit'

// Cron Vercel: hapus print job & draft transaksi yang kadaluwarsa (>30 hari)
// untuk higiene penyimpanan. Vercel mengirim Authorization: Bearer <CRON_SECRET>
// bila env itu diisi.
export const Route = createFileRoute('/api/cron/bersihkan-data')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const batas = await rateLimit(request, 10)
        if (batas) return batas
        if (!env.CRON_SECRET) {
          return gagal(
            'CRON_DISABLED',
            'Cron belum dikonfigurasi di server',
            503,
          )
        }
        if (
          !tokenCronSah(request.headers.get('authorization'), env.CRON_SECRET)
        )
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

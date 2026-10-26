import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { apiError, gagal, ok } from '#/server/api'
import { tokenCronSah } from '#/server/cronAuth'
import { cekPembayaranKadaluarsa } from '#/server/pembayaranKadaluarsa'

// Cron Vercel: batalkan transaksi online yang belum dibayar >45 menit agar
// meja tidak terkunci pesanan tanpa pembayaran.
// Vercel mengirim Authorization: Bearer <CRON_SECRET> bila env itu diisi.
export const Route = createFileRoute('/api/cron/pembayaran-kadaluarsa')({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
          return ok(await cekPembayaranKadaluarsa())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

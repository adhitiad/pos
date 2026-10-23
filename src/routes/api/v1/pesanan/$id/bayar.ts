import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { tandaiPesananLunas } from '#/server/pembayaranPesanan'
import { rateLimitPengguna } from '#/server/rateLimit'
import { ringkasHasil } from '#/server/transaksi'

export const Route = createFileRoute('/api/v1/pesanan/$id/bayar')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const rl = await rateLimitPengguna(pengguna.id, 'pesanan-bayar', 30)
          if (rl) return rl
          const hasil = await tandaiPesananLunas({
            id: params.id,
            via: 'MANUAL',
          })
          return ok(ringkasHasil(hasil))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

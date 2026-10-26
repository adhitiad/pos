import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, bacaJsonTerbatas, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { rateLimitPengguna } from '#/server/rateLimit'
import { finalisasiPesananDraf } from '#/server/pesananDraf'
import { FinalisasiPesananDrafSchema } from '#/validations/pesanan-draf'

// Kasir: finalisasi draft → buat Transaksi POS penuh (stock, jurnal, poin)
export const Route = createFileRoute('/api/v1/pesan-dinein/$id/finalisasi')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const rl = await rateLimitPengguna(
            pengguna.id,
            'dinein-finalisasi',
            60,
          )
          if (rl) return rl
          // Body opsional: `mejaId` hanya untuk staf yang memilihkan meja.
          const body = request.headers
            .get('content-type')
            ?.includes('application/json')
            ? await bacaJsonTerbatas(request, 16 * 1024)
            : {}
          const data = FinalisasiPesananDrafSchema.parse({
            id: params.id,
            ...(body as Record<string, unknown>),
          })
          const hasil = await finalisasiPesananDraf(pengguna.id, data)
          return ok(hasil, 200)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

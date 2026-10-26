import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { rateLimitPengguna } from '#/server/rateLimit'
import { batalPesananDrafFn } from '#/server/pesananDrafFn'

// Kasir: batalkan draft dine-in yang masih MENUNGGU
export const Route = createFileRoute('/api/v1/pesan-dinein/$id/batal')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const rl = await rateLimitPengguna(pengguna.id, 'dinein-batal', 60)
          if (rl) return rl
          const hasil = await batalPesananDrafFn({
            data: { id: params.id },
          })
          return ok(hasil, 200)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

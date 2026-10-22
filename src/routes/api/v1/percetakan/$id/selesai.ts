import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { selesaiPrintJob } from '#/server/percetakan'
import { rateLimitPrinter } from '#/server/rateLimit'

export const Route = createFileRoute('/api/v1/percetakan/$id/selesai')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(
            pengguna.id,
            'percetakan:selesai',
            20,
          )
          if (batas) return batas
          return ok(await selesaiPrintJob(params.id))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

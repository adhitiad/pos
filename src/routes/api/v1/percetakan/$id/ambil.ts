import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { ambilPrintJob } from '#/server/percetakan'

export const Route = createFileRoute('/api/v1/percetakan/$id/ambil')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          return ok(await ambilPrintJob(params.id))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

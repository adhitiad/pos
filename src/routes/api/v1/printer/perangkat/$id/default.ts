import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { setDefaultPrinterPerangkat } from '#/server/percetakan'
import { rateLimitPrinter } from '#/server/rateLimit'

export const Route = createFileRoute('/api/v1/printer/perangkat/$id/default')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(
            pengguna.id,
            'perangkat:default',
            20,
          )
          if (batas) return batas
          return ok(
            await setDefaultPrinterPerangkat(
              { id: params.id },
              pengguna.id,
              pengguna.id,
            ),
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

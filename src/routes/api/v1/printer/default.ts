import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { printerDefault } from '#/server/percetakan'
import { rateLimitPrinter } from '#/server/rateLimit'

export const Route = createFileRoute('/api/v1/printer/default')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(pengguna.id, 'default:get', 60)
          if (batas) return batas
          return ok(await printerDefault(pengguna.id))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

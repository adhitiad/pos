import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { printerDefault } from '#/server/percetakan'

export const Route = createFileRoute('/api/v1/printer/default')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          return ok(await printerDefault())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

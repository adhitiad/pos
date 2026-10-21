import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { kasirData } from '#/server/kasir'

export const Route = createFileRoute('/api/v1/kasir-data')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          return ok(await kasirData())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, bacaJsonTerbatas, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { buatBanyakMeja } from '#/server/meja'
import { GenerateMejaSchema } from '#/validations/meja'

export const Route = createFileRoute('/api/v1/meja/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const body = await bacaJsonTerbatas(request, 1024)
          const data = GenerateMejaSchema.parse(body)
          return ok(await buatBanyakMeja(data), 201)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

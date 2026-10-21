import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { buatRetur, dataRetur } from '#/server/retur'
import { BuatReturSchema, DataReturSchema } from '#/validations/retur'

export const Route = createFileRoute('/api/v1/retur/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const data = DataReturSchema.parse({
            dari: q.get('dari') ?? undefined,
            sampai: q.get('sampai') ?? undefined,
          })
          return ok(await dataRetur(data))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const data = BuatReturSchema.parse(await request.json())
          return ok(await buatRetur(pengguna.id, data), 201)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

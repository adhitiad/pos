import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { dataOpname, simpanOpname } from '#/server/opname'
import { DataOpnameSchema, SimpanOpnameSchema } from '#/validations/opname'

export const Route = createFileRoute('/api/v1/opname/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const data = DataOpnameSchema.parse({
            jenis: q.get('jenis') ?? undefined,
            dari: q.get('dari') ?? undefined,
            sampai: q.get('sampai') ?? undefined,
          })
          return ok(await dataOpname(data))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const data = SimpanOpnameSchema.parse(await request.json())
          return ok(await simpanOpname(pengguna.id, data), 201)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

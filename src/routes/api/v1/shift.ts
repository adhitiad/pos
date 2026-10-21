import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { bukaShift, dataShift, tutupShift } from '#/server/shift'
import { AksiShiftSchema, ShiftDataSchema } from '#/validations/shift'

export const Route = createFileRoute('/api/v1/shift')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const data = ShiftDataSchema.parse({
            dari: q.get('dari') ?? undefined,
            sampai: q.get('sampai') ?? undefined,
          })
          return ok(await dataShift(pengguna, data))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const data = AksiShiftSchema.parse(await request.json())
          if (data.aksi === 'buka') {
            return ok(await bukaShift(pengguna.id, data), 201)
          }
          return ok(await tutupShift(pengguna.id, data))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

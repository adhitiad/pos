import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { gagalPrintJob } from '#/server/percetakan'
import { GagalPrintJobSchema } from '#/validations/percetakan'

export const Route = createFileRoute('/api/v1/percetakan/$id/gagal')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const body = await request.json().catch(() => ({}))
          const data = GagalPrintJobSchema.parse({ id: params.id, ...body })
          return ok(await gagalPrintJob(data.id, data.pesan))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

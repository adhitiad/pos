import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { buatPrintJob, daftarPrintJob } from '#/server/percetakan'
import { rateLimitPrinter } from '#/server/rateLimit'
import {
  BuatPrintJobSchema,
  DaftarPrintJobSchema,
} from '#/validations/percetakan'

export const Route = createFileRoute('/api/v1/percetakan/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(
            pengguna.id,
            'percetakan:get',
            60,
          )
          if (batas) return batas
          const q = new URL(request.url).searchParams
          const data = DaftarPrintJobSchema.parse({
            status: q.get('status') ?? undefined,
            printerId: q.get('printerId') ?? undefined,
            take: q.get('take') ?? undefined,
          })
          return ok(await daftarPrintJob(data))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(
            pengguna.id,
            'percetakan:post',
            20,
          )
          if (batas) return batas
          const data = BuatPrintJobSchema.parse(await request.json())
          return ok(
            await buatPrintJob(
              data,
              pengguna.id,
              pengguna.role === 'OWNER' ? 'OWNER' : 'KASIR',
            ),
            201,
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

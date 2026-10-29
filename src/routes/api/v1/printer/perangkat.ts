import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, bacaJsonTerbatas, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import {
  daftarkanPrinterPerangkat,
  daftarPrinterPerangkat,
} from '#/server/percetakan'
import { rateLimitPrinter } from '#/server/rateLimit'
import { PrinterDeviceInputSchema } from '#/validations/percetakan'

export const Route = createFileRoute('/api/v1/printer/perangkat')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(pengguna.id, 'perangkat:get', 60)
          if (batas) return batas
          return ok(await daftarPrinterPerangkat(pengguna.id))
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
            'perangkat:post',
            20,
          )
          if (batas) return batas
          const body = await bacaJsonTerbatas(request, 2048)
          const data = PrinterDeviceInputSchema.parse(body)
          return ok(
            await daftarkanPrinterPerangkat(data, pengguna.id, pengguna.id),
            201,
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import {
  daftarkanPrinterPerangkat,
  daftarPrinterPerangkat,
} from '#/server/percetakan'
import { PrinterDeviceInputSchema } from '#/validations/percetakan'

export const Route = createFileRoute('/api/v1/printer/perangkat')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          return ok(await daftarPrinterPerangkat(pengguna.id))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const data = PrinterDeviceInputSchema.parse(await request.json())
          return ok(await daftarkanPrinterPerangkat(data, pengguna.id), 201)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

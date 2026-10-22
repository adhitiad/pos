import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import {
  createPrinter,
  daftarPrinter,
  hapusPrinter,
  updatePrinter,
} from '#/server/percetakan'
import { rateLimitPrinter } from '#/server/rateLimit'
import {
  PrinterIdSchema,
  PrinterInputSchema,
  UpdatePrinterSchema,
} from '#/validations/percetakan'

export const Route = createFileRoute('/api/v1/printer/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(pengguna.id, 'printer:get', 60)
          if (batas) return batas
          return ok(await daftarPrinter())
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(pengguna.id, 'printer:post', 20)
          if (batas) return batas
          return ok(
            await createPrinter(
              PrinterInputSchema.parse(await request.json()),
              pengguna.id,
              pengguna.id,
            ),
            201,
          )
        } catch (e) {
          return apiError(e)
        }
      },
      PUT: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(pengguna.id, 'printer:put', 20)
          if (batas) return batas
          return ok(
            await updatePrinter(
              UpdatePrinterSchema.parse(await request.json()),
              pengguna.id,
            ),
          )
        } catch (e) {
          return apiError(e)
        }
      },
      DELETE: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPrinter(
            pengguna.id,
            'printer:delete',
            20,
          )
          if (batas) return batas
          const id = new URL(request.url).searchParams.get('id')
          if (!id) return gagal('BAD_REQUEST', 'Query ?id= wajib', 400)
          return ok(
            await hapusPrinter(PrinterIdSchema.parse({ id }), pengguna.id),
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

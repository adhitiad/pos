import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { qrMeja } from '#/server/meja'
import { AKSES } from '#/server/peran'
import { rateLimitPengguna } from '#/server/rateLimit'
import { QrMejaSchema } from '#/validations/meja'

export const Route = createFileRoute('/api/v1/meja-qr')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const batas = await rateLimitPengguna(pengguna.id, 'meja:qr', 30)
          if (batas) return batas
          const id = new URL(request.url).searchParams.get('id') ?? ''
          const data = QrMejaSchema.parse({ id })
          return ok(await qrMeja(data))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

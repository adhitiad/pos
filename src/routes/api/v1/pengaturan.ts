import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { pengaturanData, setPengaturan } from '#/server/pengaturan'
import { SetPengaturanSchema } from '#/validations/pengaturan'

export const Route = createFileRoute('/api/v1/pengaturan')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          return ok(await pengaturanData())
        } catch (e) {
          return apiError(e)
        }
      },
      PUT: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await setPengaturan(
              SetPengaturanSchema.parse(await request.json()),
              pengguna.id,
              pengguna.role,
            ),
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { laporanBukuBesar } from '#/server/kasir'
import { LaporanSchema } from '#/validations/kasir'

export const Route = createFileRoute('/api/v1/laporan')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const data = LaporanSchema.parse({
            dari: q.get('dari'),
            sampai: q.get('sampai'),
            akunId: q.get('akunId') ?? undefined,
          })
          return ok(await laporanBukuBesar(data))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { daftarMasterAktif } from '#/server/opname'
import { JenisMasterSchema } from '#/validations/opname'

export const Route = createFileRoute('/api/v1/opname/master')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const data = JenisMasterSchema.parse({
            jenis: new URL(request.url).searchParams.get('jenis') ?? undefined,
          })
          return ok(await daftarMasterAktif(data.jenis))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { profilSaya } from '#/server/saya'

export const Route = createFileRoute('/api/v1/saya')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Semua peran yang login boleh — untuk aplikasi member.
          const pengguna = await apiPengguna(request, AKSES.semua)
          if (pengguna instanceof Response) return pengguna
          return ok(await profilSaya({ email: pengguna.email }))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

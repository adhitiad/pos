import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { notifikasiData } from '#/server/notifikasi'
import { AKSES } from '#/server/peran'

export const Route = createFileRoute('/api/v1/notifikasi')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.semua)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await notifikasiData({
              role: pengguna.role,
              email: pengguna.email,
            }),
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

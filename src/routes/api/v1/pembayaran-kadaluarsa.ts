import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { cekPembayaranKadaluarsa } from '#/server/pembayaranKadaluarsa'

export const Route = createFileRoute('/api/v1/pembayaran-kadaluarsa')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const hasil = await cekPembayaranKadaluarsa(45)
          return ok(hasil, 200)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

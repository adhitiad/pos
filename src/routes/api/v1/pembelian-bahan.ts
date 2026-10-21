import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { pembelianBahanFn } from '#/server/pembelianBahanFn'

export const Route = createFileRoute('/api/v1/pembelian-bahan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const hasil = await pembelianBahanFn({
            data: await request.json(),
          })
          return ok(hasil)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

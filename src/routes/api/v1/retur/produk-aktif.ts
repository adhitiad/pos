import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { daftarProdukAktif } from '#/server/retur'

export const Route = createFileRoute('/api/v1/retur/produk-aktif')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          return ok(await daftarProdukAktif())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

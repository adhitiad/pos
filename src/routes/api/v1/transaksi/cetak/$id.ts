import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { cetakStruk } from '#/server/transaksi'

export const Route = createFileRoute('/api/v1/transaksi/cetak/$id')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const hasil = await cetakStruk({
            id: params.id,
            peran: pengguna.role === 'OWNER' ? 'OWNER' : 'KASIR',
          })
          return ok(hasil)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

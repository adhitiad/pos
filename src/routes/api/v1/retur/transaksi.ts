import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { detailTransaksi } from '#/server/retur'
import { IdQuerySchema } from '#/validations/id'

export const Route = createFileRoute('/api/v1/retur/transaksi')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const id = new URL(request.url).searchParams.get('id') ?? undefined
          const parsed = IdQuerySchema.safeParse({ id })
          if (!parsed.success) {
            return gagal('BAD_REQUEST', 'Query ?id= wajib & harus cuid', 400)
          }
          const detail = await detailTransaksi(parsed.data.id)
          if (!detail) return gagal('DOMAIN', 'Transaksi tidak ditemukan', 422)
          return ok(detail)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

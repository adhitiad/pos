import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { produkTerpopulerFn } from '#/server/produkFn'
import { ProdukTerpopulerSchema } from '#/validations/produk'

export const Route = createFileRoute('/api/v1/produk-terpopuler')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const data = ProdukTerpopulerSchema.safeParse({
            limit: q.get('limit') ?? undefined,
          })
          if (!data.success)
            return gagal('BAD_REQUEST', 'Query ?limit= tidak valid', 400)
          return ok(
            await produkTerpopulerFn({ data: { limit: data.data.limit } }),
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

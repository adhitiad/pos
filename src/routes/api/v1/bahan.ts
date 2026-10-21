import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { bahanData, createBahan, hapusBahan, updateBahan } from '#/server/bahan'
import { BahanInputSchema, UpdateBahanSchema } from '#/validations/bahan'
import { PaginationSchema } from '#/validations/pagination'

export const Route = createFileRoute('/api/v1/bahan')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const p = PaginationSchema.parse({
            take: q.get('take'),
            skip: q.get('skip'),
          })
          return ok(await bahanData({ take: p.take, skip: p.skip }))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await createBahan(BahanInputSchema.parse(await request.json())),
            201,
          )
        } catch (e) {
          return apiError(e)
        }
      },
      PUT: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await updateBahan(
              UpdateBahanSchema.parse(await request.json()),
              pengguna.id,
            ),
          )
        } catch (e) {
          return apiError(e)
        }
      },
      DELETE: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const id = new URL(request.url).searchParams.get('id')
          if (!id) return gagal('BAD_REQUEST', 'Query ?id= wajib', 400)
          return ok(await hapusBahan({ id }, pengguna.id))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

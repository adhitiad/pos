import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { produkData } from '#/server/produk'
import {
  createProduk,
  hapusProduk,
  toggleProduk,
  updateProduk,
} from '#/server/produkMutasi'
import {
  ProdukInputSchema,
  ToggleProdukSchema,
  UpdateProdukSchema,
} from '#/validations/produk'
import { PaginationSchema } from '#/validations/pagination'

export const Route = createFileRoute('/api/v1/produk')({
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
          return ok(await produkData({ take: p.take, skip: p.skip }))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const body = await request.json()
          // POST { toggle: true } → ganti status aktif tanpa full update
          if (body && typeof body === 'object' && 'toggle' in body) {
            return ok(
              await toggleProduk(ToggleProdukSchema.parse(body), pengguna.id),
            )
          }
          return ok(await createProduk(ProdukInputSchema.parse(body)), 201)
        } catch (e) {
          return apiError(e)
        }
      },
      PUT: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await updateProduk(
              UpdateProdukSchema.parse(await request.json()),
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
          return ok(await hapusProduk({ id }, pengguna.id))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

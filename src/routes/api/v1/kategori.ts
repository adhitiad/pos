import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { kategoriData } from '#/server/produk'
import { createKategori, hapusKategori } from '#/server/produkMutasi'
import { KategoriInputSchema } from '#/validations/produk'

export const Route = createFileRoute('/api/v1/kategori')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(await kategoriData())
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await createKategori(
              KategoriInputSchema.parse(await request.json()),
            ),
            201,
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
          return ok(await hapusKategori({ id }, pengguna.id))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

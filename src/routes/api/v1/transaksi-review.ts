import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, bacaJsonTerbatas, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { riwayatReviewTransaksi } from '#/server/reviewAntrean'
import { reviewTransaksi } from '#/server/reviewTransaksi'
import { ReviewTransaksiSchema } from '#/validations/draft-transaksi'

export const Route = createFileRoute('/api/v1/transaksi-review')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const take = Number(
            new URL(request.url).searchParams.get('take') ?? '50',
          )
          return ok(
            await riwayatReviewTransaksi(Number.isFinite(take) ? take : 50),
          )
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const body = ReviewTransaksiSchema.parse(
            await bacaJsonTerbatas(request, 256 * 1024),
          )
          const hasil = await reviewTransaksi(
            body.draftId,
            body.keputusan,
            body.catatan,
            pengguna.id,
            pengguna.role,
          )
          return ok(hasil, 201)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

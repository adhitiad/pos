import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, bacaJsonTerbatas, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { batalDraftTransaksi } from '#/server/draftTransaksi'
import { DraftIdSchema } from '#/validations/draft-transaksi'

export const Route = createFileRoute('/api/v1/transaksi-draft-batal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const { draftId } = DraftIdSchema.parse(
            await bacaJsonTerbatas(request, 256 * 1024),
          )
          await batalDraftTransaksi(draftId, pengguna.id)
          return ok({ ok: true })
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

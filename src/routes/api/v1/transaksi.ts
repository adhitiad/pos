import { createFileRoute } from '@tanstack/react-router'

import {
  apiError,
  apiPengguna,
  bacaJsonTerbatas,
  ok,
  denganRateLimit,
  denganRequestId,
} from '#/server/api'
import { AKSES } from '#/server/peran'
import { postingTransaksi, ringkasHasil } from '#/server/transaksi'
import { PostingTransaksiSchema } from '#/validations/transaksi'

export const Route = createFileRoute('/api/v1/transaksi')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return denganRateLimit(request, async () => {
          return denganRequestId(request, async () => {
            try {
              const pengguna = await apiPengguna(request, AKSES.operasional)
              if (pengguna instanceof Response) return pengguna
              const hasil = await postingTransaksi(
                PostingTransaksiSchema.parse(
                  await bacaJsonTerbatas(request, 256 * 1024),
                ),
                pengguna.id,
                { aktor: { id: pengguna.id, peran: pengguna.role } },
              )
              return ok(ringkasHasil(hasil), 201)
            } catch (e) {
              return apiError(e)
            }
          })
        })
      },
    },
  },
})

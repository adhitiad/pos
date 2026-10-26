import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, bacaJsonTerbatas, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import {
  buatDraftTransaksi,
  daftarDraftTransaksi,
} from '#/server/draftTransaksi'
import { daftarDraftMenunggu } from '#/server/reviewAntrean'

export const Route = createFileRoute('/api/v1/transaksi-draft')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const draft = await buatDraftTransaksi(
            await bacaJsonTerbatas(request, 256 * 1024),
            pengguna.id,
          )
          return ok(draft, 201)
        } catch (e) {
          return apiError(e)
        }
      },
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          // `?semua=1` khusus OWNER: antrean lintas kasir untuk review.
          const semua =
            new URL(request.url).searchParams.get('semua') === '1' &&
            pengguna.role === 'OWNER'
          const daftar = semua
            ? await daftarDraftMenunggu()
            : await daftarDraftTransaksi(pengguna.id)
          return ok(daftar)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { kunjunganDataFn } from '#/server/kunjunganFn'
import { GrupKunjunganSchema } from '#/validations/kunjungan'

export const Route = createFileRoute('/api/v1/kunjungan/data')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const url = new URL(request.url)
          const dari = url.searchParams.get('dari') ?? undefined
          const sampai = url.searchParams.get('sampai') ?? undefined
          const grup = GrupKunjunganSchema.parse(
            url.searchParams.get('grup') ?? 'harian',
          )
          const hasil = await kunjunganDataFn({ data: { dari, sampai, grup } })
          return ok(hasil)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

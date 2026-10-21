import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { memberRiwayat } from '#/server/member'
import { IdQuerySchema } from '#/validations/id'

export const Route = createFileRoute('/api/v1/member/riwayat')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const id = new URL(request.url).searchParams.get('id') ?? undefined
          const parsed = IdQuerySchema.safeParse({ id })
          if (!parsed.success) {
            return gagal('BAD_REQUEST', 'Query ?id= wajib & harus cuid', 400)
          }
          return ok(await memberRiwayat(parsed.data.id))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

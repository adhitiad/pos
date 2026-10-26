import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, bacaJsonTerbatas, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { rateLimit } from '#/server/rateLimit'
import { detailPesananDraf, updatePesananDraf } from '#/server/pesananDraf'
import { UpdatePesananDrafSchema } from '#/validations/pesanan-draf'

// Kasir: detail atau modifikasi draft dine-in (lihat semua detail, tambah/kurangi item)
export const Route = createFileRoute('/api/v1/pesan-dinein/$id/')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const rl = await rateLimit(request, 100)
          if (rl) return rl
          try {
            return ok(await detailPesananDraf(params.id))
          } catch (e) {
            return apiError(e)
          }
        } catch (e) {
          return apiError(e)
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const rl = await rateLimit(request, 60)
          if (rl) return rl
          const body = await bacaJsonTerbatas(request, 256 * 1024)
          const data = UpdatePesananDrafSchema.parse({
            id: params.id,
            ...(body as Record<string, unknown>),
          })
          return ok(await updatePesananDraf(pengguna.id, data))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

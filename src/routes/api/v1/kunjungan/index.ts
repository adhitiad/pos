import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPenggunaOpsional, ok } from '#/server/api'
import { recordPageVisitFn } from '#/server/kunjunganFn'
import { normalkanPath } from '#/server/kunjungan'
import { ipSaatIni } from '#/server/rateLimit'

export const Route = createFileRoute('/api/v1/kunjungan/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Endpoint publik: pengunjung anonim ikut dihitung (userType
          // 'non-member'). `userId` selalu dari sesi, tak pernah dari klien.
          const pengguna = await apiPenggunaOpsional(request)
          // Path dari `Referer` (header peramban) dengan fallback `x-path`
          // ternormalisasi; userId selalu dari sesi, IP dari soket tepercaya.
          const path =
            normalkanPath(request.headers.get('referer')) ??
            normalkanPath(request.headers.get('x-path'))
          if (!path) return ok({ ok: true })
          await recordPageVisitFn({
            data: {
              path,
              userId: pengguna?.id,
              ipAddress: ipSaatIni(),
              userAgent: request.headers.get('user-agent') ?? undefined,
            },
          })
          return ok({ ok: true })
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

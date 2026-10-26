import { createFileRoute } from '@tanstack/react-router'

import {
  apiError,
  apiPenggunaOpsional,
  bacaJsonTerbatas,
  ok,
} from '#/server/api'
import { memberIdDariEmail } from '#/server/member'
import { rateLimit } from '#/server/rateLimit'
import { pesanTransaksi, pesananData } from '#/server/pesanan'

export const Route = createFileRoute('/api/v1/pesan')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const rl = await rateLimit(request, 60)
          if (rl) return rl
          const mejaToken = new URL(request.url).searchParams
            .get('mejaToken')
            ?.slice(0, 512)
          return ok(await pesananData({ mejaToken: mejaToken || undefined }))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const rl = await rateLimit(request, 10)
          if (rl) return rl
          const pengguna = await apiPenggunaOpsional(request)
          const memberId =
            pengguna?.role === 'MEMBER'
              ? await memberIdDariEmail(pengguna.email)
              : null
          const hasil = await pesanTransaksi(
            await bacaJsonTerbatas(request, 256 * 1024),
            { memberId: memberId ?? undefined },
          )
          return ok(hasil, 201)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

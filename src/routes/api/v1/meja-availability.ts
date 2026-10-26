import { createFileRoute } from '@tanstack/react-router'

import { apiError, ok } from '#/server/api'
import { mejaKetersediaan } from '#/server/pesananDraf'
import { rateLimit } from '#/server/rateLimit'

// Endpoint publik untuk ketersediaan meja (tanpa auth).
// Digunakan halaman /pesan untuk menampilkan berapa meja kosong.
export const Route = createFileRoute('/api/v1/meja-availability')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const rl = await rateLimit(request, 60)
          if (rl) return rl
          return ok(await mejaKetersediaan())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

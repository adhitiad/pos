import { createFileRoute } from '@tanstack/react-router'

import { gagal, ok } from '#/server/api'
import { rateLimit } from '#/server/rateLimit'
import { prisma } from '#/db'

export const Route = createFileRoute('/api/v1/health')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const batas = await rateLimit(request, 60)
          if (batas) return batas
          await prisma.$queryRawUnsafe('SELECT 1')
          return ok({
            status: 'ok',
            timestamp: new Date().toISOString(),
          })
        } catch (e) {
          return gagal(
            'SERVICE_UNAVAILABLE',
            'Database tidak dapat dihubungi',
            503,
          )
        }
      },
    },
  },
})

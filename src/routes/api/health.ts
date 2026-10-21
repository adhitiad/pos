import { createFileRoute } from '@tanstack/react-router'

import { prisma } from '#/db'
import { rateLimit } from '#/server/rateLimit'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let database: 'ok' | 'gagal' = 'gagal'
        try {
          const batas = await rateLimit(request, 60)
          if (batas) return batas
          await prisma.$queryRaw`SELECT 1`
          database = 'ok'
        } catch {
          database = 'gagal'
        }

        return Response.json(
          {
            database,
            app: database === 'ok' ? 'healthy' : 'degraded',
          },
          {
            status: database === 'ok' ? 200 : 503,
            headers: { 'Cache-Control': 'no-store' },
          },
        )
      },
    },
  },
})

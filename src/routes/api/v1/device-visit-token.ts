import { createFileRoute } from '@tanstack/react-router'

import { apiError, ok } from '#/server/api'
import { terbitkanTokenDeviceFn } from '#/server/deviceVisitFn'

// Token analytics publik (SEC-24). Token ditandatangani server dan mengikat
// identitas perangkat ke IP + User-Agent saat diterbitkan.
export const Route = createFileRoute('/api/v1/device-visit-token')({
  server: {
    handlers: {
      POST: async () => {
        try {
          return ok(await terbitkanTokenDeviceFn())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

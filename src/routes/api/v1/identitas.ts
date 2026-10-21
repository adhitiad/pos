import { createFileRoute } from '@tanstack/react-router'

import { apiError, ok } from '#/server/api'
import { identitasApp } from '#/server/pengaturan'

export const Route = createFileRoute('/api/v1/identitas')({
  server: {
    handlers: {
      // Identitas publik untuk web & Expo (judul, ikon, logo, deskripsi).
      GET: async () => {
        try {
          return ok(await identitasApp())
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

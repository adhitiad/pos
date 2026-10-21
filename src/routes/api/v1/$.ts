import { createFileRoute } from '@tanstack/react-router'

import { gagal } from '#/server/api'

// Endpoint /api/v1/* yang tidak dikenal → balas envelope JSON, bukan dokumen
// HTML. Klien mobile (Expo) selalu parses JSON; halaman HTML 404 akan
// menggagalkan `res.json()`.
export const Route = createFileRoute('/api/v1/$')({
  server: {
    handlers: {
      GET: async () => gagal('NOT_FOUND', 'Endpoint tidak ditemukan', 404),
      POST: async () => gagal('NOT_FOUND', 'Endpoint tidak ditemukan', 404),
      PUT: async () => gagal('NOT_FOUND', 'Endpoint tidak ditemukan', 404),
      PATCH: async () => gagal('NOT_FOUND', 'Endpoint tidak ditemukan', 404),
      DELETE: async () => gagal('NOT_FOUND', 'Endpoint tidak ditemukan', 404),
    },
  },
})

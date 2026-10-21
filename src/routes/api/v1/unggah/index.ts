import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { hapusAset, tandaTanganUnggah } from '#/server/cloudinary'
import { AsetUrlSchema } from '#/validations/unggah'

export const Route = createFileRoute('/api/v1/unggah/')({
  server: {
    handlers: {
      // Buat tanda tangan upload (kredensial Cloudinary tetap di server).
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(tandaTanganUnggah())
        } catch (e) {
          return apiError(e)
        }
      },
      // Hapus aset milik folder POS (SSRF-safe: publicId diturunkan dari URL).
      DELETE: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const { url } = AsetUrlSchema.parse(await request.json())
          return ok(await hapusAset(url))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

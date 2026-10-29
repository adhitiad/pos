import { createFileRoute } from '@tanstack/react-router'

import {
  apiError,
  apiPengguna,
  bacaJsonTerbatas,
  ok,
  denganRateLimit,
  denganRequestId,
} from '#/server/api'
import { AKSES } from '#/server/peran'
import { daftarFitur, setFitur } from '#/server/pengaturan'

// Feature flag via tabel pengaturan (tanpa deploy ulang).
// GET    /api/v1/pengaturan/fitur        → daftar semua fitur + status
// PUT    /api/v1/pengaturan/fitur        → { kunci, nilai (boolean), peran? }
export const Route = createFileRoute('/api/v1/pengaturan/fitur')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          return ok(await daftarFitur())
        } catch (e) {
          return apiError(e)
        }
      },
      PUT: async ({ request }) => {
        return denganRateLimit(request, async () => {
          return denganRequestId(request, async () => {
            try {
              const pengguna = await apiPengguna(request, AKSES.manajerial)
              if (pengguna instanceof Response) return pengguna
              const body = bacaJsonTerbatas(request, 4 * 1024)
              const { kunci, nilai, peran } = (await body) as {
                kunci: string
                nilai: boolean
                peran?: 'OWNER' | 'KASIR' | 'MEMBER'
              }
              if (!kunci || typeof nilai !== 'boolean') {
                throw new Error('Kunci dan nilai (boolean) wajib diisi')
              }
              return ok(await setFitur({ kunci, nilai, peran }, pengguna.id))
            } catch (e) {
              return apiError(e)
            }
          })
        })
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal } from '#/server/api'
import { AKSES } from '#/server/peran'
import { ambilAsetUnduh } from '#/server/cloudinary'
import { UnduhQuerySchema } from '#/validations/unggah'

export const Route = createFileRoute('/api/v1/unggah/unduh')({
  server: {
    handlers: {
      // Unduh aset lewat server (bukan langsung dari browser). Server hanya
      // meneruskan URL Cloudinary cloud+folder kita (cegah SSRF).
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const url = new URL(request.url).searchParams.get('url') ?? undefined
          const parsed = UnduhQuerySchema.safeParse({ url })
          if (!parsed.success) {
            return gagal('BAD_REQUEST', 'Query ?url= wajib & harus URL', 400)
          }
          const aset = await ambilAsetUnduh(parsed.data.url)
          const tipe =
            aset.headers.get('content-type') ?? 'application/octet-stream'
          const nama = parsed.data.url.split('/').pop()?.split('?')[0] ?? 'aset'
          return new Response(aset.body, {
            headers: {
              'content-type': tipe,
              'content-disposition': `attachment; filename="${nama}"`,
              'cache-control': 'private, max-age=300',
            },
          })
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

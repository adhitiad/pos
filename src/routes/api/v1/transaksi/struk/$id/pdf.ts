import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna } from '#/server/api'
import { AKSES } from '#/server/peran'
import { eksporStrukPdf } from '#/server/strukPdf'

export const Route = createFileRoute('/api/v1/transaksi/struk/$id/pdf')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const hasil = await eksporStrukPdf(params.id)
          return new Response(new Uint8Array(hasil.isi), {
            headers: {
              'content-type': hasil.tipe,
              'content-disposition': `attachment; filename="${hasil.nama}"`,
            },
          })
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

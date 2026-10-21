import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { laporanPajak } from '#/server/laporanPajak'
import {
  FormatEksporPajakSchema,
  LaporanPajakSchema,
} from '#/validations/laporan-pajak'
import {
  eksporCsvPajak,
  eksporPdfPajak,
  eksporXlsxPajak,
} from '#/server/laporanEksporPajak'

export const Route = createFileRoute('/api/v1/laporan-pajak')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const data = LaporanPajakSchema.parse({
            dari: q.get('dari'),
            sampai: q.get('sampai'),
            grup: q.get('grup') ?? 'bulanan',
          })
          const laporan = await laporanPajak(data)

          const format = q.get('format')
          if (!format) return ok(laporan)
          const f = FormatEksporPajakSchema.safeParse(format)
          if (!f.success)
            return gagal('BAD_REQUEST', 'format harus csv|xlsx|pdf', 400)

          const hasil =
            f.data === 'csv'
              ? eksporCsvPajak(laporan)
              : f.data === 'xlsx'
                ? eksporXlsxPajak(laporan)
                : await eksporPdfPajak(laporan)

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

import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { laporanBelanja } from '#/server/laporanBelanja'
import {
  eksporCsvBelanja,
  eksporPdfBelanja,
  eksporXlsxBelanja,
} from '#/server/laporanEksporBelanja'
import {
  FormatEksporBelanjaSchema,
  LaporanBelanjaSchema,
} from '#/validations/laporan-belanja'

export const Route = createFileRoute('/api/v1/laporan-belanja')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const data = LaporanBelanjaSchema.parse({
            dari: q.get('dari'),
            sampai: q.get('sampai'),
            supplierId: q.get('supplierId') ?? undefined,
            sumberBelanja: q.get('sumberBelanja') ?? undefined,
          })
          const laporan = await laporanBelanja(data)

          const format = q.get('format')
          if (!format) return ok(laporan)
          const f = FormatEksporBelanjaSchema.safeParse(format)
          if (!f.success)
            return gagal('BAD_REQUEST', 'format harus csv|xlsx|pdf', 400)

          const hasil =
            f.data === 'csv'
              ? eksporCsvBelanja(laporan)
              : f.data === 'xlsx'
                ? eksporXlsxBelanja(laporan)
                : await eksporPdfBelanja(laporan)

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

import { createFileRoute } from '@tanstack/react-router'

import {
  apiError,
  apiPengguna,
  gagal,
  okEtag,
  denganRateLimit,
  denganRequestId,
} from '#/server/api'
import { AKSES } from '#/server/peran'
import { laporanPenjualan } from '#/server/laporanPenjualan'
import {
  FormatEksporSchema,
  LaporanPenjualanSchema,
} from '#/validations/laporan-penjualan'
import { eksporCsv, eksporPdf, eksporXlsx } from '#/server/laporanEkspor'

export const Route = createFileRoute('/api/v1/laporan-penjualan')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return denganRateLimit(request, async () => {
          return denganRequestId(request, async () => {
            try {
              const pengguna = await apiPengguna(request, AKSES.manajerial)
              if (pengguna instanceof Response) return pengguna
              const q = new URL(request.url).searchParams
              const data = LaporanPenjualanSchema.parse({
                dari: q.get('dari'),
                sampai: q.get('sampai'),
                grup: q.get('grup') ?? 'harian',
                dimensi: q.get('dimensi') || undefined,
                kategoriId: q.get('kategoriId') || undefined,
                kasirId: q.get('kasirId') || undefined,
                shiftId: q.get('shiftId') || undefined,
                memberId: q.get('memberId') || undefined,
                metodeBayar: q.get('metodeBayar') || undefined,
                mejaId: q.get('mejaId') || undefined,
                deliveryId: q.get('deliveryId') || undefined,
                sumber: q.get('sumber') || undefined,
                statusPesanan: q.get('statusPesanan') || undefined,
                pajakJenis: q.get('pajakJenis') || undefined,
              })
              const laporan = await laporanPenjualan(data)

              const format = q.get('format')
              if (!format) return okEtag(laporan, request)
              const f = FormatEksporSchema.safeParse(format)
              if (!f.success)
                return gagal('BAD_REQUEST', 'format harus csv|xlsx|pdf', 400)

              const hasil =
                f.data === 'csv'
                  ? eksporCsv(laporan)
                  : f.data === 'xlsx'
                    ? eksporXlsx(laporan)
                    : await eksporPdf(laporan)

              return new Response(new Uint8Array(hasil.isi), {
                headers: {
                  'content-type': hasil.tipe,
                  'content-disposition': `attachment; filename="${hasil.nama}"`,
                },
              })
            } catch (e) {
              return apiError(e)
            }
          })
        })
      },
    },
  },
})

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
import { imporProdukDryRun } from '#/server/imporProduk'
import { ImporProdukDryRunSchema } from '#/validations/impor'

// Dry-run validasi impor produk dari CSV.
// POST /api/v1/impor/produk  { csv: string, opsi?: { updateJikaAda: boolean } }
// Hanya memvalidasi dan mengembalikan ringkasan per baris — TIDAK menulis ke DB.
// Impor benar-benar diimplementasikan dalam langkah terpisah setelah dry-run disetujui.
export const Route = createFileRoute('/api/v1/impor/produk')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return denganRateLimit(request, async () => {
          return denganRequestId(request, async () => {
            try {
              const pengguna = await apiPengguna(request, AKSES.manajerial)
              if (pengguna instanceof Response) return pengguna
              const body = ImporProdukDryRunSchema.parse(
                await bacaJsonTerbatas(request, 512 * 1024),
              )
              const hasil = await imporProdukDryRun(body)
              return ok(hasil)
            } catch (e) {
              return apiError(e)
            }
          })
        })
      },
    },
  },
})

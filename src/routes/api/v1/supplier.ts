import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import {
  catatPembayaranHutang,
  createSupplier,
  hapusSupplier,
  hutangSupplier,
  supplierData,
  updateSupplier,
} from '#/server/supplier'
import {
  HapusSupplierSchema,
  PembayaranHutangSchema,
  SupplierIdSchema,
  SupplierInputSchema,
  UpdateSupplierSchema,
} from '#/validations/supplier'

export const Route = createFileRoute('/api/v1/supplier')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          // ?hutang=<supplierId> → daftar pembelian yang belum lunas.
          const supplierId = q.get('hutang')
          if (supplierId) {
            const data = SupplierIdSchema.parse({ supplierId })
            return ok(await hutangSupplier(data.supplierId))
          }
          return ok(await supplierData())
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const body = await request.json()
          // POST { bayar: { ... } } → catat pelunasan hutang usaha.
          if (body && typeof body === 'object' && 'bayar' in body) {
            return ok(
              await catatPembayaranHutang(
                PembayaranHutangSchema.parse(body.bayar),
                pengguna.id,
              ),
              201,
            )
          }
          return ok(
            await createSupplier(SupplierInputSchema.parse(body), pengguna.id),
            201,
          )
        } catch (e) {
          return apiError(e)
        }
      },
      PUT: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await updateSupplier(
              UpdateSupplierSchema.parse(await request.json()),
              pengguna.id,
            ),
          )
        } catch (e) {
          return apiError(e)
        }
      },
      DELETE: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const id = new URL(request.url).searchParams.get('id')
          if (!id) return gagal('BAD_REQUEST', 'Query ?id= wajib', 400)
          return ok(
            await hapusSupplier(HapusSupplierSchema.parse({ id }), pengguna.id),
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

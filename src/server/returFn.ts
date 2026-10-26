import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { buatRetur, detailTransaksi } from './retur.js'
import { BuatReturSchema, DetailTransaksiSchema } from '#/validations/retur'

// ─── Server function Retur (kasir + owner) ───

export const buatReturFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => BuatReturSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return buatRetur(pengguna.id, data)
  })

export const detailTransaksiFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => DetailTransaksiSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return detailTransaksi(data.id)
  })

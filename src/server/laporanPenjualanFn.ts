import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { laporanPenjualan } from './laporanPenjualan.js'
import { LaporanPenjualanSchema } from '#/validations/laporan-penjualan'

export const laporanPenjualanFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => LaporanPenjualanSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return laporanPenjualan(data)
  })

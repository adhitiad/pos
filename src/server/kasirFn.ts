import { createServerFn } from '@tanstack/react-start'

import { requireKasir, requireOwner } from './auth.js'
import { kasirData, laporanBukuBesar } from './kasir.js'
import { LaporanSchema } from '#/validations/kasir'

export const kasirDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const pengguna = await requireKasir()
    return kasirData(pengguna.id)
  },
)

export const laporanFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => LaporanSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return laporanBukuBesar(data)
  })

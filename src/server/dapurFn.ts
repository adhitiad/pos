import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { dapurData, updateStatusPesanan } from './transaksi.js'
import { UpdateStatusPesananSchema } from '#/validations/transaksi'

export const dapurDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireKasir()
    return dapurData()
  },
)

export const updateStatusPesananFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdateStatusPesananSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return updateStatusPesanan(data)
  })

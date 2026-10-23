import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { dapurData, updateStatusPesanan } from './transaksi.js'
import { tandaiPesananLunas } from './pembayaranPesanan.js'
import { ringkasHasil } from './ringkasTransaksi.js'
import {
  TandaiLunasSchema,
  UpdateStatusPesananSchema,
} from '#/validations/transaksi'

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

export const tandaiLunasFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => TandaiLunasSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return ringkasHasil(
      await tandaiPesananLunas({ id: data.id, via: 'MANUAL' }),
    )
  })

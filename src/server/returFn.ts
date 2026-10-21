import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requireKasir } from './auth.js'
import {
  buatRetur,
  dataRetur,
  daftarProdukAktif,
  detailTransaksi,
} from './retur.js'
import { BuatReturSchema, DataReturSchema } from '#/validations/retur'

// ─── Server function Retur (kasir + owner) ───

export const buatReturFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => BuatReturSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return buatRetur(pengguna.id, data)
  })

export const produkAktifFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireKasir()
    return daftarProdukAktif()
  },
)

export const detailTransaksiFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) =>
    z.object({ id: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireKasir()
    return detailTransaksi(data.id)
  })

export const dataReturFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => DataReturSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return dataRetur(data)
  })

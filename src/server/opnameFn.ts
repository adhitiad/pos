import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requireKasir } from './auth.js'
import { simpanOpname, dataOpname, daftarMasterAktif } from './opname.js'
import { SimpanOpnameSchema, DataOpnameSchema } from '#/validations/opname'

// ─── Server function Stok Opname (kasir + owner) ───

export const simpanOpnameFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => SimpanOpnameSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return simpanOpname(pengguna.id, data)
  })

export const masterAktifFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) =>
    z.object({ jenis: z.enum(['PRODUK', 'BAHAN']) }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireKasir()
    return daftarMasterAktif(data.jenis)
  })

export const dataOpnameFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => DataOpnameSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return dataOpname(data)
  })

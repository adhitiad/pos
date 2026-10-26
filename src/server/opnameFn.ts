import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { simpanOpname, daftarMasterAktif } from './opname.js'
import { SimpanOpnameSchema, JenisMasterSchema } from '#/validations/opname'

// ─── Server function Stok Opname (kasir + owner) ───

export const simpanOpnameFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => SimpanOpnameSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return simpanOpname(pengguna.id, data)
  })

export const masterAktifFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => JenisMasterSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return daftarMasterAktif(data.jenis)
  })

import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from '#/server/auth'
import { pembelianBahan, daftarPembelianBahan } from '#/server/pembelianBahan'
import {
  PembelianBahanSchema,
  PembelianBahanQuerySchema,
} from '#/validations/pembelian-bahan'

export const pembelianBahanFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PembelianBahanSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return pembelianBahan(data)
  })

export const daftarPembelianBahanFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => PembelianBahanQuerySchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return daftarPembelianBahan(data)
  })

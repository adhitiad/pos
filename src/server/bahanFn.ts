import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { bahanData, createBahan, hapusBahan, updateBahan } from './bahan.js'
import {
  BahanInputSchema,
  HapusBahanSchema,
  UpdateBahanSchema,
} from '#/validations/bahan'

export const bahanDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireOwner()
    return bahanData()
  },
)

export const createBahanFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => BahanInputSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return createBahan(data)
  })

export const updateBahanFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdateBahanSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return updateBahan(data, pengguna.id)
  })

export const hapusBahanFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => HapusBahanSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return hapusBahan(data, pengguna.id)
  })

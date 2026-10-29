import { createServerFn } from '@tanstack/react-start'

import { requireKasir, requireOwner } from './auth.js'
import {
  mejaData,
  createMeja,
  hapusMeja,
  qrMeja,
  toggleMeja,
  updateMeja,
  buatBanyakMeja,
} from './meja.js'
import {
  HapusMejaSchema,
  GenerateMejaSchema,
  MejaInputSchema,
  QrMejaSchema,
  ToggleMejaSchema,
  UpdateMejaSchema,
} from '#/validations/meja'

export const mejaDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireKasir()
    return mejaData()
  },
)

export const createMejaFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => MejaInputSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return createMeja(data)
  })

export const updateMejaFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdateMejaSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return updateMeja(data)
  })

export const hapusMejaFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => HapusMejaSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return hapusMeja(data)
  })

export const toggleMejaFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ToggleMejaSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return toggleMeja(data)
  })

export const qrMejaFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => QrMejaSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return qrMeja(data)
  })

export const buatBanyakMejaFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => GenerateMejaSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return buatBanyakMeja(data)
  })

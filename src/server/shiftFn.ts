import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { bukaShift, dataShift, tutupShift } from './shift.js'
import {
  BukaShiftSchema,
  ShiftDataSchema,
  TutupShiftSchema,
} from '#/validations/shift'

export const shiftDataFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ShiftDataSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return dataShift(pengguna, data)
  })

export const bukaShiftFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => BukaShiftSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return bukaShift(pengguna.id, data)
  })

export const tutupShiftFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => TutupShiftSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return tutupShift(pengguna.id, data)
  })

import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { dataShift } from './shift.js'
import { ShiftDataSchema } from '#/validations/shift'

// ─── Laporan rekap shift (owner) ───
// Agregat semua shift dalam rentang tanggal; dipanggil halaman laporan.

export const laporanShiftFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ShiftDataSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return dataShift(pengguna, data)
  })

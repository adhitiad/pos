import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { catatPengeluaran } from './pengeluaran.js'
import { PengeluaranSchema } from '#/validations/pengeluaran'

// Wrapper server function: validasi + guard OWNER + panggil fungsi murni.
// Dipakai halaman /buku-besar (owner-only) untuk input pengeluaran.
export const catatPengeluaranFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PengeluaranSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return catatPengeluaran(data)
  })

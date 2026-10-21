import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { laporanPajak } from './laporanPajak.js'
import { LaporanPajakSchema } from '#/validations/laporan-pajak'

// ─── Laporan rekap pajak periode (PB1/PPN) — owner ───

export const laporanPajakFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => LaporanPajakSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return laporanPajak(data)
  })

import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { laporanBelanja } from './laporanBelanja.js'
import { LaporanBelanjaSchema } from '#/validations/laporan-belanja'

export const laporanBelanjaFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => LaporanBelanjaSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return laporanBelanja(data)
  })

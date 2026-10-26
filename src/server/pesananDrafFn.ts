import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { daftarPesananDraf, batalPesananDraf } from './pesananDraf.js'
import { BatalPesananDrafSchema } from '#/validations/pesanan-draf'

// ─── Kasir (requireKasir) ───

export const daftarPesananDrafFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireKasir()
  return daftarPesananDraf()
})

export const batalPesananDrafFn = createServerFn({
  method: 'POST',
})
  .validator((input: unknown) => BatalPesananDrafSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return batalPesananDraf(data)
  })

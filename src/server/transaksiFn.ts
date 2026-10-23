import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { postingTransaksi, ringkasHasil } from './transaksi.js'
import { PostingTransaksiSchema } from '#/validations/transaksi'

export const postingTransaksiFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PostingTransaksiSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return ringkasHasil(
      await postingTransaksi(data, pengguna.id, {
        aktor: { id: pengguna.id, peran: pengguna.role },
      }),
    )
  })

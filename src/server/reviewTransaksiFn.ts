import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { reviewTransaksi } from './reviewTransaksi.js'
import { ReviewTransaksiSchema } from '#/validations/draft-transaksi'

export const reviewTransaksiFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ReviewTransaksiSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return reviewTransaksi(
      data.draftId,
      data.keputusan,
      data.catatan,
      pengguna.id,
      pengguna.role,
    )
  })

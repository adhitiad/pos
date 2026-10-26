import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { setPengaturan } from './pengaturan.js'
import { daftarDraftMenunggu, riwayatReviewTransaksi } from './reviewAntrean.js'
import { SetModeReviewSchema } from '#/validations/pengaturan'

export const listDraftMenungguFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireOwner()
    return daftarDraftMenunggu()
  },
)

export const riwayatReviewTransaksiFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireOwner()
  return riwayatReviewTransaksi()
})

// Hanya owner yang boleh mengubah kebijakan owner-approval.
export const setModeReviewTransaksiFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => SetModeReviewSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return setPengaturan(
      { kunci: 'review_transaksi_mode', nilai: data.mode },
      pengguna.id,
      pengguna.role,
    )
  })

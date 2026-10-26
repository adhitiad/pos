import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { buatDraftTransaksi } from './draftTransaksi.js'
import { BuatDraftTransaksiSchema } from '#/validations/draft-transaksi'

const rapihkanDraft = (d: {
  id: string
  nomor: string
  status: string
  subtotal: { toNumber: () => number }
  total: { toNumber: () => number }
  metodeBayar: string
  dibuatOffline: boolean
  createdAt: Date
  updatedAt: Date
}) => ({
  id: d.id,
  nomor: d.nomor,
  status: d.status,
  subtotal: d.subtotal.toNumber(),
  total: d.total.toNumber(),
  metodeBayar: d.metodeBayar,
  dibuatOffline: d.dibuatOffline,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
})

export const createDraftTransaksiFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => BuatDraftTransaksiSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    const draft = await buatDraftTransaksi(data, pengguna.id)
    return rapihkanDraft(draft)
  })

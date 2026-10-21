import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { recordPageVisit, kunjunganData } from './kunjungan.js'
import { batasiNama } from './rateLimit.js'
import {
  KunjunganQuerySchema,
  RecordPageVisitSchema,
} from '#/validations/kunjungan'

export const recordPageVisitFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => RecordPageVisitSchema.parse(input))
  .handler(async ({ data }) => {
    // Batas publik (web & Expo) untuk cegah DoS storage.
    await batasiNama('kunjungan', 120, 60_000)
    await recordPageVisit(data)
    return { ok: true }
  })

export const kunjunganDataFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => KunjunganQuerySchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return kunjunganData(data)
  })

import { createServerFn } from '@tanstack/react-start'

import { requireOwner, getPengguna } from './auth.js'
import { recordDeviceVisit, daftarDeviceVisit } from './deviceVisit.js'
import { batasiNama, ipSaatIni } from './rateLimit.js'
import {
  DeviceVisitSchema,
  DeviceVisitQuerySchema,
} from '#/validations/device-visit'

export const recordDeviceVisitFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => DeviceVisitSchema.parse(input))
  .handler(async ({ data }) => {
    // Batas publik (web & Expo) untuk cegah DoS storage.
    await batasiNama('device-visit', 60, 60_000)
    // `userId` diturunkan dari sesi, bukan dari body klien (anti-racun data).
    const pengguna = await getPengguna()
    return recordDeviceVisit({
      ...data,
      userId: pengguna?.id,
      ipAddress: ipSaatIni(),
    })
  })

export const daftarDeviceVisitFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => DeviceVisitQuerySchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return daftarDeviceVisit(data)
  })

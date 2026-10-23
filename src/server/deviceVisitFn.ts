import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { env } from '#/env'
import { requireOwner, getPengguna } from './auth.js'
import { recordDeviceVisit, daftarDeviceVisit } from './deviceVisit.js'
import { buatTokenDevice, lokasiDariHeader } from './deviceToken.js'
import { batasiGlobal, batasiNama, ipSaatIni } from './rateLimit.js'
import {
  DeviceVisitSchema,
  DeviceVisitQuerySchema,
} from '#/validations/device-visit'

// Terbitkan token analytics. Per-IP dan global dibatasi karena endpoint publik.
export const terbitkanTokenDeviceFn = createServerFn({
  method: 'POST',
}).handler(async () => {
  await batasiNama('device-visit-token', 10, 60_000)
  await batasiGlobal('device-visit-token', 120, 60_000)
  const headers = getRequestHeaders()
  return buatTokenDevice({
    ipAddress: ipSaatIni(),
    userAgent: headers.get('user-agent') ?? '',
  })
})

export const recordDeviceVisitFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => DeviceVisitSchema.parse(input))
  .handler(async ({ data }) => {
    // Batas publik (web & Expo) untuk cegah DoS storage. Token + upsert per
    // perangkat sudah mengurangi spam; batas global menahan bot farm (SEC-24).
    await batasiNama('device-visit', 20, 60_000)
    await batasiGlobal('device-visit', 600, 60_000)
    // `userId` diturunkan dari sesi, bukan dari body klien (anti-racun data).
    const pengguna = await getPengguna()
    const headers = getRequestHeaders()
    return recordDeviceVisit({
      token: data.token,
      userId: pengguna?.id,
      ipAddress: ipSaatIni(),
      userAgent: headers.get('user-agent') ?? '',
      // Header geolokasi hanya tepercaya bila memang lewat proxy tepercaya.
      lokasi: env.TRUST_PROXY
        ? lokasiDariHeader((nama) => headers.get(nama))
        : null,
    })
  })

export const daftarDeviceVisitFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => DeviceVisitQuerySchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return daftarDeviceVisit(data)
  })

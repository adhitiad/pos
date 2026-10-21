import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { rateLimit } from '#/server/rateLimit'
import {
  recordDeviceVisitFn,
  daftarDeviceVisitFn,
} from '#/server/deviceVisitFn'
import type { FilterDeviceVisit } from '#/types/device-visit'

export const Route = createFileRoute('/api/v1/device-visit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Endpoint publik (analytics) → batasi agar tak di-spam tanpa henti.
          const rl = await rateLimit(request, 30)
          if (rl) return rl
          const body = (await request.json()) as Record<string, unknown>
          // `userId` klien diabaikan; di-resolve dari sesi di recordDeviceVisitFn.
          delete body.userId
          const hasil = await recordDeviceVisitFn({ data: body })
          return ok(hasil)
        } catch (e) {
          return apiError(e)
        }
      },
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const url = new URL(request.url)
          const data: FilterDeviceVisit = {}
          const deviceId = url.searchParams.get('deviceId')
          const userId = url.searchParams.get('userId')
          const userType = url.searchParams.get('userType')
          const klasifikasi = url.searchParams.get('klasifikasi')
          const dari = url.searchParams.get('dari')
          const sampai = url.searchParams.get('sampai')
          const limit = url.searchParams.get('limit')
          if (deviceId) data.deviceId = deviceId
          if (userId) data.userId = userId
          if (userType) data.userType = userType as 'member' | 'non-member'
          if (klasifikasi) data.klasifikasi = klasifikasi
          if (dari) data.dari = dari
          if (sampai) data.sampai = sampai
          if (limit) data.limit = Number(limit)
          const hasil = await daftarDeviceVisitFn({ data })
          return ok(hasil)
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})

import { prisma } from '#/db'
import {
  DeviceVisitQuerySchema,
  DeviceVisitSchema,
} from '#/validations/device-visit'
import type {
  DeviceVisitInput,
  DeviceVisitQueryInput,
} from '#/validations/device-visit'
import type { DeviceVisitRow } from '#/types/device-visit'
// Cek role user bila userId disertakan. Owner & kasir dikecualikan dari pencatatan.
async function resolveUserType(
  userId?: string,
): Promise<'member' | 'non-member' | null> {
  if (!userId) return 'non-member'
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return 'non-member'
  if (user.role === 'OWNER' || user.role === 'KASIR') return null // dikecualikan
  return 'member'
}

export async function recordDeviceVisit(
  input: DeviceVisitInput & { ipAddress?: string },
): Promise<DeviceVisitRow | null> {
  const data = DeviceVisitSchema.parse(input)

  // Owner & kasir dikecualikan dari analytics
  const userType = await resolveUserType(data.userId)
  if (userType === null) return null

  // IP hanya dari koneksi server, tidak pernah dari body klien.
  const ip = input.ipAddress?.trim() ?? ''
  const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip) ? ip : null
  const ipv6 = ip.includes(':') && ip.length <= 45 ? ip : null

  const visit = await prisma.deviceVisit.create({
    data: {
      deviceId: data.deviceId,
      deviceName: data.deviceName ?? null,
      os: data.os,
      ipv4,
      ipv6,
      dns: null,
      lokasi: data.lokasi ?? null,
      klasifikasi: data.klasifikasi,
      userId: data.userId ?? null,
      userType,
    },
  })
  return {
    id: visit.id,
    deviceId: visit.deviceId,
    deviceName: visit.deviceName,
    os: visit.os,
    ipv4: visit.ipv4,
    ipv6: visit.ipv6,
    dns: visit.dns,
    lokasi: visit.lokasi,
    klasifikasi: visit.klasifikasi,
    userId: visit.userId,
    userType: visit.userType,
    createdAt: visit.createdAt.toISOString(),
  }
}

export async function daftarDeviceVisit(
  input: DeviceVisitQueryInput,
): Promise<DeviceVisitRow[]> {
  const data = DeviceVisitQuerySchema.parse(input)
  const visits = await prisma.deviceVisit.findMany({
    where: {
      ...(data.deviceId && { deviceId: data.deviceId }),
      ...(data.userId && { userId: data.userId }),
      ...(data.userType && { userType: data.userType }),
      ...(data.klasifikasi && { klasifikasi: data.klasifikasi }),
      ...(data.dari && {
        createdAt: { gte: new Date(`${data.dari}T00:00:00`) },
      }),
      ...(data.sampai && {
        createdAt: { lte: new Date(`${data.sampai}T23:59:59.999`) },
      }),
    },
    orderBy: { createdAt: 'desc' },
    take: data.limit ?? 200,
  })
  return visits.map((v) => ({
    id: v.id,
    deviceId: v.deviceId,
    deviceName: v.deviceName,
    os: v.os,
    ipv4: v.ipv4,
    ipv6: v.ipv6,
    dns: v.dns,
    lokasi: v.lokasi,
    klasifikasi: v.klasifikasi,
    userId: v.userId,
    userType: v.userType,
    createdAt: v.createdAt.toISOString(),
  }))
}

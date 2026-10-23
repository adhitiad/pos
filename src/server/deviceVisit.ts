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
import { bacaTokenDevice, deteksiPerangkat } from './deviceToken.js'

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

function keBaris(visit: {
  id: string
  deviceId: string
  deviceName: string | null
  os: string
  ipv4: string | null
  ipv6: string | null
  dns: string | null
  lokasi: string | null
  klasifikasi: string
  userId: string | null
  userType: string
  createdAt: Date
  terakhirDilihat: Date
  jumlahKunjungan: number
}): DeviceVisitRow {
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
    terakhirDilihat: visit.terakhirDilihat.toISOString(),
    jumlahKunjungan: visit.jumlahKunjungan,
  }
}

export async function recordDeviceVisit(
  input: DeviceVisitInput & {
    ipAddress?: string
    userAgent?: string
    lokasi?: string | null
    userId?: string
  },
): Promise<DeviceVisitRow | null> {
  const data = DeviceVisitSchema.parse(input)
  const userAgent = input.userAgent?.trim() ?? ''
  // Token memuat deviceId turunan server; body klien tidak bisa memalsukannya.
  const { deviceId } = bacaTokenDevice(data.token, userAgent)

  // Owner & kasir dikecualikan dari analytics
  const userType = await resolveUserType(input.userId)
  if (userType === null) return null

  // IP hanya dari koneksi server, tidak pernah dari body klien.
  const ip = input.ipAddress?.trim() ?? ''
  const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip) ? ip : null
  const ipv6 = ip.includes(':') && ip.length <= 45 ? ip : null
  const perangkat = deteksiPerangkat(userAgent)

  const visit = await prisma.deviceVisit.upsert({
    where: { deviceId },
    create: {
      deviceId,
      deviceName: perangkat.deviceName,
      os: perangkat.os,
      ipv4,
      ipv6,
      dns: null,
      lokasi: input.lokasi ?? null,
      klasifikasi: perangkat.klasifikasi,
      userId: input.userId ?? null,
      userType,
      terakhirDilihat: new Date(),
      jumlahKunjungan: 1,
    },
    update: {
      deviceName: perangkat.deviceName,
      os: perangkat.os,
      ipv4,
      ipv6,
      lokasi: input.lokasi ?? null,
      klasifikasi: perangkat.klasifikasi,
      userId: input.userId ?? null,
      userType,
      terakhirDilihat: new Date(),
      jumlahKunjungan: { increment: 1 },
    },
  })
  return keBaris(visit)
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
        terakhirDilihat: { gte: new Date(`${data.dari}T00:00:00`) },
      }),
      ...(data.sampai && {
        terakhirDilihat: { lte: new Date(`${data.sampai}T23:59:59.999`) },
      }),
    },
    orderBy: { terakhirDilihat: 'desc' },
    take: data.limit ?? 200,
  })
  return visits.map(keBaris)
}
